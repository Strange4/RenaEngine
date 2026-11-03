using Docker.DotNet;
using Docker.DotNet.Models;
using LanguageExt;
using LanguageExt.Common;
using Microsoft.Extensions.Logging;
using Rena.Generator;

namespace Rena.Server.DockerManager;

public interface IDockerService
{
    public Task<Result<string>> CreateOrReplaceImageAsync(string playerId, string zipFilePath, string dockerFilePath);
    public Task<Result<string>> CreateOrReplaceImageAsync(
        string playerId,
        string zipFilePath,
        string dockerFilePath,
        Option<IDictionary<string, string>> buildArgs
    );
    public Task<Result<string>> CreateOrReplaceImageAsync(
        string playerId,
        string zipFilePath,
        string dockerFilePath,
        string language,
        Option<IDictionary<string, string>> buildArgs = default
    );
    public Task<Result<Unit>> StartContainerWithIdAsync(string containerId);
    public Task<Result<Unit>> CreateAndStartContainerWithIdAsync(
        string containerId,
        string imageId,
        Option<IDictionary<string, string>> envVars = default
    );
    public Task<Result<Unit>> KillContainerWithIdAsync(string containerId);
}

public abstract class AbstractDockerService(IDockerClient dockerClient, ILogger logger)
{
    protected readonly IDockerClient _client = dockerClient;
    protected readonly ILogger _logger = logger;
}

public class DockerService : AbstractDockerService, IDockerService
{
    private readonly IDockerContainerService _containers;
    private readonly IDockerImageService _images;
    private readonly IReadOnlyDictionary<string, IDockerBuildContextStrategy> _buildContextStrategies;

    public DockerService(IDockerClient dockerClient, ILogger logger)
        : this(dockerClient, logger, [new TypeScriptDockerBuildContextStrategy()]) { }

    public DockerService(IDockerClient dockerClient, ILogger logger, IEnumerable<IDockerBuildContextStrategy> buildContextStrategies)
        : base(dockerClient, logger)
    {
        this._containers = new DockerContainerService(dockerClient, logger);
        this._images = new DockerImageService(dockerClient, logger);
        this._buildContextStrategies = buildContextStrategies.ToDictionary(strategy => strategy.LanguageName, StringComparer.Ordinal);
    }

    public async Task<Result<Unit>> CreateAndStartContainerWithIdAsync(
        string containerId,
        string imageId,
        Option<IDictionary<string, string>> envVars = default
    )
    {
        var createParameters = new CreateContainerParameters
        {
            Env = envVars.IfNone(new Dictionary<string, string>()).Select(pair => $"{pair.Key}={pair.Value}").ToList(),
        };
        Result<CreateContainerResponse> created = await this._containers.CreateContainerAsync(imageId, containerId, createParameters);

        return await created.Match(
            async response =>
            {
                if (string.IsNullOrWhiteSpace(response.ID))
                {
                    var error = Error.FromObject($"Docker did not return an ID for container {containerId}");
                    this._logger.LogError("{Error}", error);
                    return new Result<Unit>(error);
                }

                return await this._containers.StartContainerAsync(response.ID);
            },
            error => Task.FromResult(new Result<Unit>(error))
        );
    }

    public Task<Result<string>> CreateOrReplaceImageAsync(string playerId, string zipFilePath, string dockerFilePath)
    {
        return this.CreateOrReplaceImageAsync(playerId, zipFilePath, dockerFilePath, default);
    }

    public Task<Result<string>> CreateOrReplaceImageAsync(
        string playerId,
        string zipFilePath,
        string dockerFilePath,
        Option<IDictionary<string, string>> buildArgs
    )
    {
        IReadOnlyList<string> availableLanguages = SDKBuilder.AvailableLanguageGenerators();
        if (availableLanguages.Count != 1)
        {
            const string error = "Specify a language when zero or multiple SDK languages are available.";
            this._logger.LogError(error);
            return Task.FromResult(new Result<string>(Error.FromObject(error)));
        }

        return this.CreateOrReplaceImageAsync(playerId, zipFilePath, dockerFilePath, availableLanguages[0], buildArgs);
    }

    public async Task<Result<string>> CreateOrReplaceImageAsync(
        string playerId,
        string zipFilePath,
        string dockerFilePath,
        string language,
        Option<IDictionary<string, string>> buildArgs = default
    )
    {
        if (string.IsNullOrWhiteSpace(playerId))
        {
            const string error = "A player ID is required to tag the Docker image.";
            this._logger.LogError(error);
            return new Result<string>(Error.FromObject(error));
        }

        if (!File.Exists(zipFilePath))
        {
            this._logger.LogError("Player archive {ZipFilePath} was not found", zipFilePath);
            return new Result<string>(Error.FromObject($"Player archive {zipFilePath} was not found"));
        }

        if (!File.Exists(dockerFilePath))
        {
            this._logger.LogError("Dockerfile {DockerFilePath} was not found", dockerFilePath);
            return new Result<string>(Error.FromObject($"Dockerfile {dockerFilePath} was not found"));
        }

        try
        {
            if (!SDKBuilder.AvailableLanguageGenerators().Contains(language, StringComparer.Ordinal))
            {
                string error = $"Language {language} is not supported.";
                this._logger.LogError("Language {Languuage} is not supported", language);
                return new Result<string>(Error.FromObject(error));
            }

            if (!this._buildContextStrategies.TryGetValue(language, out var buildContextStrategy))
            {
                string error = $"No Docker build context strategy is registered for supported language {language}.";
                this._logger.LogError(error);
                return new Result<string>(Error.FromObject(error));
            }

            var request = new DockerImageBuildRequest
            {
                ImageName = playerId,
                Dockerfile = await File.ReadAllTextAsync(dockerFilePath),
                FilesArchive = File.OpenRead(zipFilePath),
                Language = language,
                BuildArgs = buildArgs.IfNone(new Dictionary<string, string>()),
            };
            await using var archive = request.FilesArchive;
            Result<IDockerBuildContext> contextResult = await buildContextStrategy.CreateAsync(request);
            return await contextResult.Match(
                async context =>
                {
                    await using (context)
                    {
                        Result<Unit> imageResult = await this._images.CreateImageAsync(request, context.Content);
                        return imageResult.Match(_ => new Result<string>(playerId), error => new Result<string>(error));
                    }
                },
                error => Task.FromResult(new Result<string>(error))
            );
        }
        catch (Exception ex)
        {
            this._logger.LogError(ex, "Failed to create or replace image for player {PlayerId}", playerId);
            return new Result<string>(Error.New(ex));
        }
    }

    public Task<Result<Unit>> KillContainerWithIdAsync(string containerId)
    {
        return this._containers.StopContainerAsync(containerId);
    }

    public Task<Result<Unit>> StartContainerWithIdAsync(string containerId)
    {
        return this._containers.StartContainerAsync(containerId);
    }
}
