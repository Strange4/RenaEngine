using LanguageExt;

using static LanguageExt.Prelude;

using Docker.DotNet;
using Docker.DotNet.Models;

namespace DockerOrchestrator;

class Orchestrator(DockerClient dockerClient)
{
    readonly DockerClient _client = dockerClient;

    async Task<Option<ContainerListResponse>> FindContainerById(string id, bool isRunning = true)
    {
        IDictionary<string, IDictionary<string, bool>> idFilter = new Dictionary<string, IDictionary<string, bool>>()
        {
            ["id"] = new Dictionary<string, bool>()
            {
                { id, true }
            }
        };
        IList<ContainerListResponse> result = await this.FindContainers(new ContainersListParameters() { Filters = idFilter, All = !isRunning });
        return result.Find(_ => _.ID == id);
    }

    public async Task<bool> StartContainer(string id, Option<ContainerStartParameters> parameters = new Option<ContainerStartParameters>())
    {
        try
        {
            Option<ContainerListResponse> container = await this.FindContainerById(id, false);
            return await container.Match(
                Some: async c => await this._client.Containers.StartContainerAsync(id, parameters.IfNone(new ContainerStartParameters())),
                None: () => Task.FromResult(false));
        }
        catch (DockerApiException ex)
        {
            Console.WriteLine($"[Docker API Error] Status: {ex.StatusCode} | Message: {ex.Message} | Body: {ex.ResponseBody}");
            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Unexpected Error] {ex.Message}");
            return false;
        }
    }

    public async Task<bool> StopContainer(string id)
    {
        try
        {
            Option<ContainerListResponse> container = await this.FindContainerById(id);
            return await container.Match(
                Some: async c => await this._client.Containers.StopContainerAsync(id, new ContainerStopParameters()),
                None: () => Task.FromResult(false)
            );
        }
        catch (DockerApiException ex)
        {
            Console.WriteLine($"[Docker API Error] Status: {ex.StatusCode} | Message: {ex.Message} | Body: {ex.ResponseBody}");
            return false;
        }
    }

    public async Task<IList<ContainerListResponse>> GetStoppedContainers()
    {
        return await _client.Containers.ListContainersAsync(new ContainersListParameters() { All = true });
    }

    public async Task<IList<ContainerListResponse>> GetRunningContainers()
    {
        return await _client.Containers.ListContainersAsync(new ContainersListParameters() { All = false });
    }

    public async Task<IList<ContainerListResponse>> FindContainers(ContainersListParameters filterParams)
    {
        return Optional(await _client.Containers.ListContainersAsync(filterParams)).IfNone([]);
    }

    public async Task<Option<ContainerListResponse>> GetContainerById(string id)
    {
        return await this.FindContainerById(id);
    }

    public async Task<Option<ContainerListResponse>> FindFirstContainer(ContainersListParameters filterParams)
    {
        return Optional((await this.FindContainers(filterParams)).FirstOrDefault());
    }

    public async Task<IList<ImagesListResponse>> GetAllImages(Option<ImagesListParameters> parameters)
    {
        return Optional(await this._client.Images.ListImagesAsync(parameters.IfNone(new ImagesListParameters()))).IfNone([]);
    }
}