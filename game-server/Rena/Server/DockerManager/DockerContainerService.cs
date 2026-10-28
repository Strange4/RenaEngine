using Docker.DotNet;
using Docker.DotNet.Models;

using LanguageExt;

using Microsoft.Extensions.Logging;

using static LanguageExt.Prelude;

namespace Rena.Server.DockerManager;

interface IDockerContainerService
{
    Task<Option<ContainerListResponse>> GetContainerByIdAsync(string id, bool isRunning = true);

    Task<Option<CreateContainerResponse>> CreateContainerAsync(string imageId, string containerName, Option<CreateContainerParameters> parameters = default);

    Task<bool> DeleteContainerAsync(string id, Option<ContainerRemoveParameters> parameters = default);

    Task<bool> StartContainerAsync(string id, Option<ContainerStartParameters> parameters = default);
    Task<bool> StopContainerAsync(string id);
}

public class DockerContainerService(IDockerClient dockerClient, ILogger logger) : DockerService(dockerClient, logger), IDockerContainerService
{
    public async Task<Option<CreateContainerResponse>> CreateContainerAsync(string imageId, string containerName, Option<CreateContainerParameters> parameters = default)
    {
        try
        {
            var createParams = parameters.IfNone(new CreateContainerParameters());
            createParams.Image = imageId;
            createParams.Name = containerName;

            var response = await this._client.Containers.CreateContainerAsync(createParams);
            return Optional(response);
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "[Docker API Error] Status: {StatusCode} | Message: {Message}", ex.StatusCode, ex.Message);
            return Option<CreateContainerResponse>.None;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Unexpected Error] {Message}", ex.Message);
            return Option<CreateContainerResponse>.None;
        }
    }

    public async Task<bool> DeleteContainerAsync(string id, Option<ContainerRemoveParameters> parameters = default)
    {
        try
        {
            Option<ContainerListResponse> container = await this.GetContainerByIdAsync(id, false);
            return await container.Match(
                Some: async _ =>
                {
                    await this._client.Containers.RemoveContainerAsync(id, parameters.IfNone(new ContainerRemoveParameters()));
                    return true;
                },
                None: () => Task.FromResult(false)
            );
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to delete container {Id}", id);
            return false;
        }
    }

    public async Task<Option<ContainerListResponse>> GetContainerByIdAsync(string id, bool isRunning = true)
    {
        IDictionary<string, IDictionary<string, bool>> idFilter = new Dictionary<string, IDictionary<string, bool>>()
        {
            ["id"] = new Dictionary<string, bool>()
            {
                { id, true }
            }
        };
        IList<ContainerListResponse> result = await this._client.Containers.ListContainersAsync(new ContainersListParameters() { Filters = idFilter, All = !isRunning });
        return result.Find(_ => _.ID == id);
    }

    public async Task<bool> StartContainerAsync(string id, Option<ContainerStartParameters> parameters = default)
    {
        try
        {
            Option<ContainerListResponse> container = await this.GetContainerByIdAsync(id, false);
            return await container.Match(
                Some: async _ => await this._client.Containers.StartContainerAsync(id, parameters.IfNone(new ContainerStartParameters())),
                None: () => Task.FromResult(false));
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to start container {Id}", id);
            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Unexpected Error] {ex.Message}");
            return false;
        }
    }

    public async Task<bool> StopContainerAsync(string id)
    {
        try
        {
            Option<ContainerListResponse> container = await this.GetContainerByIdAsync(id);
            return await container.Match(
                Some: async _ => await this._client.Containers.StopContainerAsync(id, new ContainerStopParameters()),
                None: () => Task.FromResult(false)
            );
        }
        catch (DockerApiException ex)
        {
            _logger.LogError(ex, "Failed to stop container {Id}", id);
            return false;
        }
    }
}