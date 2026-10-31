using Docker.DotNet;

using Microsoft.Extensions.Logging;

namespace Rena.Server.DockerManager;

public interface IDockerService
{
    public Task CreateOrReplaceImage(string playerId, string zipFilePath, string dockerFilePath);
    public Task StartContainerWithId(string playerId, string containerId);
    public Task KillContainerWithId(string containerId);
    // public Task GetContainerStatusAndLogs(string containerId);
}

public abstract class AbstractDockerService(IDockerClient dockerClient, ILogger logger) : IDockerService
{
    protected readonly IDockerClient _client = dockerClient;
    protected readonly ILogger _logger = logger;

    public async Task CreateOrReplaceImage(string playerId, string zipFilePath, string dockerFilePath)
    {
        throw new NotImplementedException();
    }

    public async Task KillContainerWithId(string containerId)
    {
        throw new NotImplementedException();
    }

    public Task StartContainerWithId(string playerId, string containerId)
    {
        throw new NotImplementedException();
    }
}

public class Orchestrator(IDockerClient dockerClient, ILogger logger) : AbstractDockerService(dockerClient, logger)
{
    private readonly IDockerImageService _images = new DockerImageService(dockerClient, logger);
    private readonly IDockerContainerService _containers = new DockerContainerService(dockerClient, logger);
}
