using Docker.DotNet;

using Microsoft.Extensions.Logging;

namespace Rena.Server.DockerManager;

public abstract class DockerService(IDockerClient dockerClient, ILogger logger)
{
    protected readonly IDockerClient _client = dockerClient;
    protected readonly ILogger _logger = logger;
}

public class Orchestrator(IDockerClient dockerClient, ILogger logger) : DockerService(dockerClient, logger)
{
    private readonly IDockerImageService _images = new DockerImageService(dockerClient, logger);
    private readonly IDockerImageService _containers = new DockerImageService(dockerClient, logger);
}
