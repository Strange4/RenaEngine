using Docker.DotNet;
using Docker.DotNet.Models;

using LanguageExt.Common;

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

    private static bool IsSuccess<T>(Result<T> result) => result.Match(_ => true, _ => false);

    private static bool IsFailure<T>(Result<T> result) => result.Match(_ => false, _ => true);

    [Test]
    public async Task GetContainerByIdAsync_ReturnsMatchingContainerAndListsAllWhenRequested()
    {
        const string containerId = "container-123";
        this._fixture.ContainerResponses = [new() { ID = containerId }];

        var result = await this._service.GetContainerByIdAsync(containerId, isRunning: false);

        Assert.That(IsSuccess(result), Is.True);
        result.IfSucc(container => Assert.That(container.ID, Is.EqualTo(containerId)));
        this._fixture.Containers.Verify(operations => operations.ListContainersAsync(
            It.Is<ContainersListParameters>(parameters =>
                parameters.All == true &&
                parameters.Filters["id"].ContainsKey(containerId)),
            default), Times.Once);
    }

    [Test]
    public async Task GetContainerByIdAsync_ReturnsFailureWhenContainerIsMissing()
    {
        var result = await this._service.GetContainerByIdAsync("missing");

        Assert.That(IsFailure(result), Is.True);
    }

    [Test]
    public async Task CreateContainerAsync_SetsImageAndNameOnProvidedParameters()
    {
        CreateContainerParameters parameters = new() { Cmd = ["app", "run"] };

        var result = await this._service.CreateContainerAsync("image-123", "test-container", parameters);

        Assert.That(IsSuccess(result), Is.True);
        result.IfSucc(response => Assert.That(response.ID, Is.EqualTo(this._fixture.CreateContainerResponse.ID)));
        this._fixture.Containers.Verify(operations => operations.CreateContainerAsync(
            It.Is<CreateContainerParameters>(value =>
                value.Image == "image-123" &&
                value.Name == "test-container" &&
                value.Cmd != null &&
                value.Cmd.SequenceEqual(new[] { "app", "run" })),
            default), Times.Once);
    }

    [Test]
    public async Task CreateContainerAsync_ReturnsFailureWhenDockerApiFails()
    {
        this._fixture.Containers
            .Setup(operations => operations.CreateContainerAsync(It.IsAny<CreateContainerParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.BadRequest, "Bad Request"));

        var result = await this._service.CreateContainerAsync("image-123", "test-container");

        Assert.That(IsFailure(result), Is.True);
    }

    [Test]
    public async Task CreateContainerAsync_ReturnsFailureWhenUnexpectedErrorOccurs()
    {
        this._fixture.Containers
            .Setup(operations => operations.CreateContainerAsync(It.IsAny<CreateContainerParameters>(), default))
            .ThrowsAsync(new InvalidOperationException("Unexpected"));

        var result = await this._service.CreateContainerAsync("image-123", "test-container");

        Assert.That(IsFailure(result), Is.True);
    }

    [Test]
    public async Task StartContainerAsync_WhenContainerExistsStartsIt()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];

        var result = await this._service.StartContainerAsync("container-123");

        Assert.That(IsSuccess(result), Is.True);
        this._fixture.Containers.Verify(operations => operations.StartContainerAsync(
            "container-123", It.IsAny<ContainerStartParameters>(), default), Times.Once);
    }

    [Test]
    public async Task StartContainerAsync_WhenContainerIsMissingReturnsFailure()
    {
        var result = await this._service.StartContainerAsync("missing");

        Assert.That(IsFailure(result), Is.True);
        this._fixture.Containers.Verify(operations => operations.StartContainerAsync(
            It.IsAny<string>(), It.IsAny<ContainerStartParameters>(), default), Times.Never);
    }

    [Test]
    public async Task StartContainerAsync_WhenDockerApiFailsReturnsFailure()
    {
        this._fixture.Containers
            .Setup(operations => operations.ListContainersAsync(It.IsAny<ContainersListParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.BadRequest, "Bad Request"));

        var result = await this._service.StartContainerAsync("container-123");

        Assert.That(IsFailure(result), Is.True);
    }

    [Test]
    public async Task StartContainerAsync_WhenUnexpectedErrorOccursReturnsFailure()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];
        this._fixture.Containers
            .Setup(operations => operations.StartContainerAsync(
                "container-123", It.IsAny<ContainerStartParameters>(), default))
            .ThrowsAsync(new InvalidOperationException("Unexpected"));

        var result = await this._service.StartContainerAsync("container-123");

        Assert.That(IsFailure(result), Is.True);
    }

    [Test]
    public async Task StopContainerAsync_WhenContainerExistsStopsIt()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123", State = "running" }];

        var result = await this._service.StopContainerAsync("container-123");

        Assert.That(IsSuccess(result), Is.True);
        this._fixture.Containers.Verify(operations => operations.StopContainerAsync(
            "container-123", It.IsAny<ContainerStopParameters>(), default), Times.Once);
    }

    [Test]
    public async Task StopContainerAsync_WhenContainerIsMissingReturnsFailure()
    {
        var result = await this._service.StopContainerAsync("missing");

        Assert.That(IsFailure(result), Is.True);
        this._fixture.Containers.Verify(operations => operations.StopContainerAsync(
            It.IsAny<string>(), It.IsAny<ContainerStopParameters>(), default), Times.Never);
    }

    [Test]
    public async Task StopContainerAsync_WhenDockerApiFailsReturnsFailure()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];
        this._fixture.Containers
            .Setup(operations => operations.StopContainerAsync(
                "container-123", It.IsAny<ContainerStopParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        var result = await this._service.StopContainerAsync("container-123");

        Assert.That(IsFailure(result), Is.True);
    }

    [Test]
    public async Task DeleteContainerAsync_WhenContainerExistsRemovesIt()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123", State = "exited" }];

        var result = await this._service.DeleteContainerAsync("container-123");

        Assert.That(IsSuccess(result), Is.True);
        this._fixture.Containers.Verify(operations => operations.RemoveContainerAsync(
            "container-123", It.IsAny<ContainerRemoveParameters>(), default), Times.Once);
    }

    [Test]
    public async Task DeleteContainerAsync_WhenContainerIsMissingReturnsFailure()
    {
        var result = await this._service.DeleteContainerAsync("missing");

        Assert.That(IsFailure(result), Is.True);
        this._fixture.Containers.Verify(operations => operations.RemoveContainerAsync(
            It.IsAny<string>(), It.IsAny<ContainerRemoveParameters>(), default), Times.Never);
    }

    [Test]
    public async Task DeleteContainerAsync_WhenDockerApiFailsReturnsFailure()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];
        this._fixture.Containers
            .Setup(operations => operations.RemoveContainerAsync(
                "container-123", It.IsAny<ContainerRemoveParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        var result = await this._service.DeleteContainerAsync("container-123");

        Assert.That(IsFailure(result), Is.True);
    }
}
