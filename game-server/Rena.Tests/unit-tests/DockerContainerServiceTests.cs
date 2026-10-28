using Docker.DotNet;
using Docker.DotNet.Models;

using Moq;

using Rena.Server.DockerManager;

namespace Rena.Tests.Unit;

[TestFixture]
[Category("Unit")]
public class DockerContainerServiceTests
{
    private DockerServicesFixture _fixture = null!;
    private DockerContainerService _service = null!;

    [SetUp]
    public void SetUp()
    {
        this._fixture = new DockerServicesFixture();
        this._service = new DockerContainerService(this._fixture.DockerClient.Object, this._fixture.Logger.Object);
    }

    [TearDown]
    public void TearDown() => this._fixture.Dispose();

    [Test]
    public async Task GetContainerByIdAsync_ReturnsMatchingContainerAndListsAllWhenRequested()
    {
        const string containerId = "container-123";
        this._fixture.ContainerResponses = [new() { ID = containerId }];

        var result = await this._service.GetContainerByIdAsync(containerId, isRunning: false);

        Assert.That(result.IsSome, Is.True);
        result.IfSome(container => Assert.That(container.ID, Is.EqualTo(containerId)));
        this._fixture.Containers.Verify(operations => operations.ListContainersAsync(
            It.Is<ContainersListParameters>(parameters =>
                parameters.All == true &&
                parameters.Filters["id"].ContainsKey(containerId)),
            default), Times.Once);
    }

    [Test]
    public async Task GetContainerByIdAsync_ReturnsNoneWhenContainerIsMissing()
    {
        var result = await this._service.GetContainerByIdAsync("missing");

        Assert.That(result.IsNone, Is.True);
    }

    [Test]
    public async Task CreateContainerAsync_SetsImageAndNameOnProvidedParameters()
    {
        CreateContainerParameters parameters = new() { Cmd = ["app", "run"] };

        var result = await this._service.CreateContainerAsync("image-123", "test-container", parameters);

        Assert.That(result.IsSome, Is.True);
        result.IfSome(response => Assert.That(response.ID, Is.EqualTo(this._fixture.CreateContainerResponse.ID)));
        this._fixture.Containers.Verify(operations => operations.CreateContainerAsync(
            It.Is<CreateContainerParameters>(value =>
                value.Image == "image-123" &&
                value.Name == "test-container" &&
                value.Cmd != null &&
                value.Cmd.SequenceEqual(new[] { "app", "run" })),
            default), Times.Once);
    }

    [Test]
    public async Task CreateContainerAsync_ReturnsNoneWhenDockerApiFails()
    {
        this._fixture.Containers
            .Setup(operations => operations.CreateContainerAsync(It.IsAny<CreateContainerParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.BadRequest, "Bad Request"));

        var result = await this._service.CreateContainerAsync("image-123", "test-container");

        Assert.That(result.IsNone, Is.True);
    }

    [Test]
    public async Task CreateContainerAsync_ReturnsNoneWhenUnexpectedErrorOccurs()
    {
        this._fixture.Containers
            .Setup(operations => operations.CreateContainerAsync(It.IsAny<CreateContainerParameters>(), default))
            .ThrowsAsync(new InvalidOperationException("Unexpected"));

        var result = await this._service.CreateContainerAsync("image-123", "test-container");

        Assert.That(result.IsNone, Is.True);
    }

    [Test]
    public async Task StartContainerAsync_WhenContainerExistsStartsIt()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];

        bool result = await this._service.StartContainerAsync("container-123");

        Assert.That(result, Is.True);
        this._fixture.Containers.Verify(operations => operations.StartContainerAsync(
            "container-123", It.IsAny<ContainerStartParameters>(), default), Times.Once);
    }

    [Test]
    public async Task StartContainerAsync_WhenContainerIsMissingReturnsFalse()
    {
        bool result = await this._service.StartContainerAsync("missing");

        Assert.That(result, Is.False);
        this._fixture.Containers.Verify(operations => operations.StartContainerAsync(
            It.IsAny<string>(), It.IsAny<ContainerStartParameters>(), default), Times.Never);
    }

    [Test]
    public async Task StartContainerAsync_WhenDockerApiFailsReturnsFalse()
    {
        this._fixture.Containers
            .Setup(operations => operations.ListContainersAsync(It.IsAny<ContainersListParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.BadRequest, "Bad Request"));

        bool result = await this._service.StartContainerAsync("container-123");

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task StartContainerAsync_WhenUnexpectedErrorOccursReturnsFalse()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];
        this._fixture.Containers
            .Setup(operations => operations.StartContainerAsync(
                "container-123", It.IsAny<ContainerStartParameters>(), default))
            .ThrowsAsync(new InvalidOperationException("Unexpected"));

        bool result = await this._service.StartContainerAsync("container-123");

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task StopContainerAsync_WhenContainerExistsStopsIt()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123", State = "running" }];

        bool result = await this._service.StopContainerAsync("container-123");

        Assert.That(result, Is.True);
        this._fixture.Containers.Verify(operations => operations.StopContainerAsync(
            "container-123", It.IsAny<ContainerStopParameters>(), default), Times.Once);
    }

    [Test]
    public async Task StopContainerAsync_WhenContainerIsMissingReturnsFalse()
    {
        bool result = await this._service.StopContainerAsync("missing");

        Assert.That(result, Is.False);
        this._fixture.Containers.Verify(operations => operations.StopContainerAsync(
            It.IsAny<string>(), It.IsAny<ContainerStopParameters>(), default), Times.Never);
    }

    [Test]
    public async Task StopContainerAsync_WhenDockerApiFailsReturnsFalse()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];
        this._fixture.Containers
            .Setup(operations => operations.StopContainerAsync(
                "container-123", It.IsAny<ContainerStopParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        bool result = await this._service.StopContainerAsync("container-123");

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task DeleteContainerAsync_WhenContainerExistsRemovesIt()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123", State = "exited" }];

        bool result = await this._service.DeleteContainerAsync("container-123");

        Assert.That(result, Is.True);
        this._fixture.Containers.Verify(operations => operations.RemoveContainerAsync(
            "container-123", It.IsAny<ContainerRemoveParameters>(), default), Times.Once);
    }

    [Test]
    public async Task DeleteContainerAsync_WhenContainerIsMissingReturnsFalse()
    {
        bool result = await this._service.DeleteContainerAsync("missing");

        Assert.That(result, Is.False);
        this._fixture.Containers.Verify(operations => operations.RemoveContainerAsync(
            It.IsAny<string>(), It.IsAny<ContainerRemoveParameters>(), default), Times.Never);
    }

    [Test]
    public async Task DeleteContainerAsync_WhenDockerApiFailsReturnsFalse()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];
        this._fixture.Containers
            .Setup(operations => operations.RemoveContainerAsync(
                "container-123", It.IsAny<ContainerRemoveParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        bool result = await this._service.DeleteContainerAsync("container-123");

        Assert.That(result, Is.False);
    }
}
