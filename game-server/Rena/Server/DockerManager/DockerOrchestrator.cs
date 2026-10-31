using System.Collections.Concurrent;
using Docker.DotNet;
using Docker.DotNet.Models;
using LanguageExt;
using LanguageExt.Common;
using Microsoft.Extensions.Logging;

namespace Rena.Server.DockerManager;

public interface IDockerService
{
    public Task<Result<string>> CreateOrReplaceImageAsync(string playerId, string zipFilePath, string dockerFilePath);
    public Task<Result<Unit>> StartContainerWithIdAsync(string containerId);
    public Task<Result<Unit>> CreateAndStartContainerWithIdAsync(string containerId, string imageId);
    public Task<Result<Unit>> KillContainerWithIdAsync(string containerId);
}

public abstract class AbstractDockerService(IDockerClient dockerClient, ILogger logger)
{
    protected readonly IDockerClient _client = dockerClient;
    protected readonly ILogger _logger = logger;
}

public class DockerService(IDockerClient dockerClient, ILogger logger) : AbstractDockerService(dockerClient, logger), IDockerService
{
    private readonly IDockerContainerService _containers = new DockerContainerService(dockerClient, logger);
    private readonly IDockerBuildContextFactory _buildContexts = new TemporaryFileDockerBuildContextFactory();

    public async Task<Result<Unit>> CreateAndStartContainerWithIdAsync(string containerId, string imageId)
    {
        Result<CreateContainerResponse> created = await this._containers.CreateContainerAsync(imageId, containerId);

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

    public async Task<Result<string>> CreateOrReplaceImageAsync(string playerId, string zipFilePath, string dockerFilePath)
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
            var request = new DockerImageBuildRequest
            {
                ImageName = playerId,
                Dockerfile = await File.ReadAllTextAsync(dockerFilePath),
                FilesArchive = File.OpenRead(zipFilePath),
            };
            await using var archive = request.FilesArchive;
            Result<IDockerBuildContext> contextResult = await this._buildContexts.CreateAsync(request);
            return await contextResult.Match(
                async context =>
                {
                    await using (context)
                    {
                        var buildErrors = new ConcurrentQueue<string>();
                        var progress = new SynchronousProgress<JSONMessage>(message =>
                        {
                            if (!string.IsNullOrEmpty(message.Stream))
                            {
                                this._logger.LogInformation("{BuildOutput}", message.Stream);
                            }
                            else if (message.Error != null)
                            {
                                this._logger.LogError("{BuildError}", message.Error.Message);
                                buildErrors.Enqueue(message.Error.Message);
                            }
                            else if (!string.IsNullOrEmpty(message.Status))
                            {
                                this._logger.LogInformation("{Status} {ProgressMessage}", message.Status, message.ProgressMessage);
                            }
                        });

                        await this._client.Images.BuildImageFromDockerfileAsync(
                            new ImageBuildParameters { Dockerfile = "Dockerfile", Tags = [playerId] },
                            context.Content,
                            authConfigs: null,
                            headers: null,
                            progress,
                            CancellationToken.None
                        );

                        if (!buildErrors.IsEmpty)
                        {
                            var errors = string.Join(Environment.NewLine, buildErrors);
                            this._logger.LogError("Failed to build image {ImageName}: {Errors}", playerId, errors);
                            return new Result<string>(Error.FromObject($"Failed to build image {playerId}: {errors}"));
                        }

                        this._logger.LogInformation("Image {ImageName} finished building", playerId);
                        return new Result<string>(playerId);
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
