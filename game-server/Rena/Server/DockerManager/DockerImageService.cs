using System.Collections.Concurrent;
using System.Formats.Tar;

using Docker.DotNet;
using Docker.DotNet.Models;

using LanguageExt;

using Microsoft.Extensions.Logging;

namespace Rena.Server.DockerManager;

interface IDockerImageService
{
    public Task<bool> CreateImageAsync(string dockerFilePath, string imageName, string? buildContextPath = null, IDictionary<string, string>? buildArgs = null);

    public Task<bool> DeleteImageAsync(string imageId, Option<ImageDeleteParameters> parameters = default);

    public Task<Option<ImagesListResponse>> FindImageByIdAsync(string id);
}

sealed class SynchronousProgress<T>(Action<T> report) : IProgress<T>
{
    public void Report(T value) => report(value);
}

public class DockerImageService(IDockerClient dockerClient, ILogger logger) : DockerService(dockerClient, logger), IDockerImageService
{

    private async Task<IList<ImagesListResponse>> GetAllImages(Option<ImagesListParameters> parameters = default)
    {
        try { return await this._client.Images.ListImagesAsync(parameters.IfNone(new ImagesListParameters())); }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to list images with parameters: {Parameters}", parameters);
            return [];
        }
    }

    public async Task<bool> DeleteImageAsync(string imageId, Option<ImageDeleteParameters> parameters = default)
    {
        try
        {
            var image = await this.FindImageByIdAsync(imageId);
            return await image.Match(
                Some: async _ =>
                {
                    await this._client.Images.DeleteImageAsync(_.ID, parameters.IfNone(new ImageDeleteParameters()
                    {
                        Force = true,
                        NoPrune = false,
                    }));
                    return true;
                },
                None: () => Task.FromResult(false)
            );
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to delete image {Id}", imageId);
            return false;
        }
    }
    public async Task<bool> CreateImageAsync(string dockerFilePath, string imageName, string? buildContextPath = null, IDictionary<string, string>? buildArgs = null)
    {
        if (dockerFilePath == null)
        {
            _logger.LogError("File \"{File}\" not found", dockerFilePath);
            return false;
        }
        if (imageName == null)
        {
            _logger.LogError("Supply an image name when building image.");
            return false;
        }

        string fullDockerFilePath = Path.GetFullPath(dockerFilePath);
        string contextDirectory = Path.GetFullPath(buildContextPath ?? Path.GetDirectoryName(fullDockerFilePath)!);
        string relativeDockerFilePath = Path.GetRelativePath(contextDirectory, fullDockerFilePath)
            .Replace(Path.DirectorySeparatorChar, '/');
        if (relativeDockerFilePath == ".." || relativeDockerFilePath.StartsWith("../", StringComparison.Ordinal))
        {
            _logger.LogError("Dockerfile {Dockerfile} must be inside build context {Context}", dockerFilePath, contextDirectory);
            return false;
        }

        using var tarStream = new MemoryStream();
        TarFile.CreateFromDirectory(contextDirectory, tarStream, includeBaseDirectory: false);
        tarStream.Position = 0;

        ConcurrentQueue<string> buildErrors = new();
        var progress = new SynchronousProgress<JSONMessage>(message =>
        {
            if (!string.IsNullOrEmpty(message.Stream))
            {
                _logger.LogInformation(message.Stream);
            }
            else if (message.Error != null)
            {
                _logger.LogError("{Error}", message.Error.Message);
                buildErrors.Enqueue(message.Error.Message);
            }
            else if (!string.IsNullOrEmpty(message.Status))
            {
                _logger.LogInformation("{Status} {ProgressMessage}", message.Status, message.ProgressMessage);
            }
        });
        var buildParams = new ImageBuildParameters
        {
            Dockerfile = relativeDockerFilePath,
            Tags = [imageName],
            BuildArgs = buildArgs
        };

        await this._client.Images.BuildImageFromDockerfileAsync(
            buildParams,
            tarStream,
            authConfigs: null,
            headers: null,
            progress,
            CancellationToken.None);

        if (!buildErrors.IsEmpty)
        {
            _logger.LogError("Failed to build image {ImageName}: {Errors}", imageName, string.Join(Environment.NewLine, buildErrors));
            return false;
        }
        _logger.LogInformation("Image {ImageName} finished building", imageName);
        return true;
    }

    public async Task<Option<ImagesListResponse>> FindImageByIdAsync(string id)
    {
        IList<ImagesListResponse> result = await this.GetAllImages(new ImagesListParameters());
        return result.Find(_ => _.ID == id || _.ID.Contains(id));
    }
}