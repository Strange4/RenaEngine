using Docker.DotNet;
using Docker.DotNet.Models;

using Microsoft.Extensions.Logging;

using Moq;

using Rena.Server.DockerManager;

namespace Rena.Tests.Unit;

internal sealed class DockerServicesFixture : IDisposable
{
    public Mock<IDockerClient> DockerClient { get; } = new();
    public Mock<IContainerOperations> Containers { get; } = new();
    public Mock<IImageOperations> Images { get; } = new();
    public Mock<ILogger> Logger { get; } = new();
    public IList<ContainerListResponse> ContainerResponses { get; set; } = [];
    public IList<ImagesListResponse> ImageResponses { get; set; } = [];
    public CreateContainerResponse CreateContainerResponse { get; } = new() { ID = "container-xyz" };

    public DockerServicesFixture()
    {
        this.DockerClient.Setup(client => client.Containers).Returns(this.Containers.Object);
        this.DockerClient.Setup(client => client.Images).Returns(this.Images.Object);
        this.Containers
            .Setup(operations => operations.ListContainersAsync(It.IsAny<ContainersListParameters>(), default))
            .Returns(() => Task.FromResult(this.ContainerResponses));
        this.Containers
            .Setup(operations => operations.CreateContainerAsync(It.IsAny<CreateContainerParameters>(), default))
            .Returns(() => Task.FromResult(this.CreateContainerResponse));
        this.Containers
            .Setup(operations => operations.StartContainerAsync(
                It.IsAny<string>(), It.IsAny<ContainerStartParameters>(), default))
            .ReturnsAsync(true);
        this.Containers
            .Setup(operations => operations.StopContainerAsync(
                It.IsAny<string>(), It.IsAny<ContainerStopParameters>(), default))
            .ReturnsAsync(true);
        this.Containers
            .Setup(operations => operations.RemoveContainerAsync(
                It.IsAny<string>(), It.IsAny<ContainerRemoveParameters>(), default))
            .Returns(Task.CompletedTask);
        this.Images
            .Setup(operations => operations.ListImagesAsync(It.IsAny<ImagesListParameters>(), default))
            .Returns(() => Task.FromResult(this.ImageResponses));
        this.Images
            .Setup(operations => operations.DeleteImageAsync(It.IsAny<string>(), It.IsAny<ImageDeleteParameters>(), default))
            .ReturnsAsync(new List<IDictionary<string, string>>());
        this.Images
            .Setup(operations => operations.BuildImageFromDockerfileAsync(
                It.IsAny<ImageBuildParameters>(),
                It.IsAny<Stream>(),
                It.IsAny<IEnumerable<AuthConfig>>(),
                It.IsAny<IDictionary<string, string>>(),
                It.IsAny<IProgress<JSONMessage>>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }

    public void Dispose()
    {
        this.DockerClient.Reset();
        this.Containers.Reset();
        this.Images.Reset();
        this.Logger.Reset();
    }
}
