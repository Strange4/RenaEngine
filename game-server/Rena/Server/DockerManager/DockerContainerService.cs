using Docker.DotNet;
using Docker.DotNet.Models;
using LanguageExt;
using LanguageExt.Common;
using Microsoft.Extensions.Logging;
using static LanguageExt.Prelude;

namespace Rena.Server.DockerManager;

public interface IDockerContainerService
{
    Task<Result<ContainerListResponse>> GetContainerByIdAsync(string id, bool isRunning = true);

    Task<Result<CreateContainerResponse>> CreateContainerAsync(
        string imageId,
        string containerName,
        Option<CreateContainerParameters> parameters = default
    );

    Task<Result<Unit>> DeleteContainerAsync(string id, Option<ContainerRemoveParameters> parameters = default);

    Task<Result<Unit>> StartContainerAsync(string id, Option<ContainerStartParameters> parameters = default);
    Task<Result<Unit>> StopContainerAsync(string id);
}

public class DockerContainerService(IDockerClient dockerClient, ILogger logger) : DockerService(dockerClient, logger), IDockerContainerService
{
    public async Task<Result<CreateContainerResponse>> CreateContainerAsync(
        string imageId,
        string containerName,
        Option<CreateContainerParameters> parameters = default
    )
    {
        try
        {
            var createParams = parameters.IfNone(new CreateContainerParameters());
            createParams.Image = imageId;
            createParams.Name = containerName;

            return await this._client.Containers.CreateContainerAsync(createParams);
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "[Docker API Error] Status: {StatusCode} | Message: {Message}", ex.StatusCode, ex.Message);
            return new Result<CreateContainerResponse>(Error.New(ex));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Unexpected Error] {Message}", ex.Message);
            return new Result<CreateContainerResponse>(Error.New(ex));
        }
    }

    public async Task<Result<Unit>> DeleteContainerAsync(string id, Option<ContainerRemoveParameters> parameters = default)
    {
        try
        {
            Result<ContainerListResponse> container = await this.GetContainerByIdAsync(id, false);
            return await container.Match(
                async c =>
                {
                    await this._client.Containers.RemoveContainerAsync(c.ID, parameters.IfNone(new ContainerRemoveParameters()));
                    return new Result<Unit>(unit);
                },
                error => Task.FromResult(new Result<Unit>(error))
            );
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to delete container {Id}", id);
            return new Result<Unit>(Error.New(ex));
        }
    }

    public async Task<Result<ContainerListResponse>> GetContainerByIdAsync(string id, bool isRunning = true)
    {
        IDictionary<string, IDictionary<string, bool>> idFilter = new Dictionary<string, IDictionary<string, bool>>()
        {
            ["id"] = new Dictionary<string, bool>() { { id, true } },
        };
        IList<ContainerListResponse> result = await this._client.Containers.ListContainersAsync(
            new ContainersListParameters() { Filters = idFilter, All = !isRunning }
        );
        return result
            .Find(_ => _.ID == id)
            .Match(
                Some: _ => new Result<ContainerListResponse>(_),
                None: () =>
                {
                    var isRunningText = isRunning ? "" : "not ";
                    return new Result<ContainerListResponse>(Error.FromObject($"No container found for {id} that is {isRunningText}running"));
                }
            );
    }

    public async Task<Result<Unit>> StartContainerAsync(string id, Option<ContainerStartParameters> parameters = default)
    {
        try
        {
            Result<ContainerListResponse> container = await this.GetContainerByIdAsync(id, false);
            return await container.Match(
                async c =>
                {
                    await this._client.Containers.StartContainerAsync(c.ID, parameters.IfNone(new ContainerStartParameters()));
                    return new Result<Unit>(unit);
                },
                error => Task.FromResult(new Result<Unit>(error))
            );
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to start container {Id}", id);
            return new Result<Unit>(Error.New(ex));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Unexpected Error] {ex.Message}");
            return new Result<Unit>(Error.New(ex));
        }
    }

    public async Task<Result<Unit>> StopContainerAsync(string id)
    {
        try
        {
            Result<ContainerListResponse> container = await this.GetContainerByIdAsync(id);
            return await container.Match(
                async c =>
                {
                    await this._client.Containers.StopContainerAsync(c.ID, new ContainerStopParameters());
                    return new Result<Unit>(unit);
                },
                error => Task.FromResult(new Result<Unit>(error))
            );
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to stop container {Id}", id);
            return new Result<Unit>(Error.New(ex));
        }
    }
}
