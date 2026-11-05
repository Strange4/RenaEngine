using System.Collections.Concurrent;
using Docker.DotNet;
using Docker.DotNet.Models;
using LanguageExt;
using LanguageExt.Common;
using Microsoft.Extensions.Logging;
using static LanguageExt.Prelude;

namespace Rena.Server.DockerManager;

sealed class SynchronousProgress<T>(Action<T> report) : IProgress<T>
{
    public void Report(T value) => report(value);
}

public interface IDockerImageService
{
    public Task<Result<Unit>> CreateImageAsync(DockerImageBuildRequest request, string buildContextPath);

    public Task<Result<Unit>> DeleteImageAsync(string imageId, Option<ImageDeleteParameters> parameters = default);

    public Task<Result<ImagesListResponse>> FindImageByIdAsync(string id);
}

public class DockerImageService(IDockerClient dockerClient, ILogger logger) : AbstractDockerService(dockerClient, logger), IDockerImageService
{
    private async Task<Result<IList<ImagesListResponse>>> GetAllImages(Option<ImagesListParameters> parameters = default)
    {
        try
        {
            var res = await this._client.Images.ListImagesAsync(parameters.IfNone(new ImagesListParameters()));
            return new Result<IList<ImagesListResponse>>(res);
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to list images with parameters: {Parameters}", parameters);
            return new Result<IList<ImagesListResponse>>(Error.FromObject($"Failed to list images with parameters: {parameters}"));
        }
    }

    public async Task<Result<Unit>> DeleteImageAsync(string imageId, Option<ImageDeleteParameters> parameters = default)
    {
        try
        {
            var image = await this.FindImageByIdAsync(imageId);
            return await image.Match(
                async found =>
                {
                    await this._client.Images.DeleteImageAsync(
                        found.ID,
                        parameters.IfNone(new ImageDeleteParameters() { Force = true, NoPrune = false })
                    );
                    return new Result<Unit>(unit);
                },
                error => Task.FromResult(new Result<Unit>(error))
            );
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to delete image {Id}", imageId);
            return new Result<Unit>(Error.FromObject($"Failed to delete image {imageId}"));
        }
    }

    public async Task<Result<Unit>> CreateImageAsync(DockerImageBuildRequest request, string buildContextPath)
    {
        var buildParams = new ImageBuildParameters
        {
            Dockerfile = "Dockerfile",
            Tags = [request.ImageName],
            BuildArgs = request.BuildArgs,
        };

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

        await using var buildContext = new FileStream(
            buildContextPath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            81920,
            FileOptions.Asynchronous | FileOptions.SequentialScan
        );
        await this._client.Images.BuildImageFromDockerfileAsync(
            buildParams,
            buildContext,
            authConfigs: null,
            headers: null,
            progress,
            CancellationToken.None
        );

        if (!buildErrors.IsEmpty)
        {
            var errors = string.Join(Environment.NewLine, buildErrors);
            _logger.LogError("Failed to build image {ImageName}: {Errors}", request.ImageName, errors);
            return new Result<Unit>(Error.FromObject($"Failed to build image {request.ImageName}: {errors}"));
        }
        _logger.LogInformation("Image {ImageName} finished building", request.ImageName);
        return new Result<Unit>(unit);
    }

    public async Task<Result<ImagesListResponse>> FindImageByIdAsync(string id)
    {
        var result = await this.GetAllImages(new ImagesListParameters());
        return result.Match(
            images =>
                images
                    .Find(_ => _.ID == id || _.ID.Contains(id))
                    .Match(
                        Some: image => new Result<ImagesListResponse>(image),
                        None: () => new Result<ImagesListResponse>(Error.FromObject($"No image found for id {id}"))
                    ),
            error => new Result<ImagesListResponse>(error)
        );
    }
}
