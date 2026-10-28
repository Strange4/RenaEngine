using Docker.DotNet;
using Docker.DotNet.Models;
using Moq;
using Rena.Server;

namespace Rena.Tests.Unit;

[TestFixture]
public class OrchestratorTests
{
    private DockerOperationsFixture _fixture = null!;
    private Mock<IContainerOperations> ContainerOperationsMock => this._fixture.Containers;
    private Mock<IImageOperations> ImagesOperationsMock => this._fixture.Images;
    private Orchestrator Orchestrator => _fixture.Orchestrator;

    [SetUp]
    public void SetUp()
    {
        _fixture = new DockerOperationsFixture();
    }

    [TearDown]
    public void TearDown() => _fixture.Dispose();

    [Test]
    public async Task GetRunningContainers_ReturnsRunningContainers()
    {
        var containers = new List<ContainerListResponse>
        {
            new() { ID = "c-running", State = "running" },
        };
        this._fixture.ContainerResponses = containers;

        var result = await this.Orchestrator.GetRunningContainers();

        Assert.That(result, Has.Count.EqualTo(1));
        Assert.That(result[0].ID, Is.EqualTo("c-running"));
    }

    [Test]
    public async Task GetStoppedContainers_ReturnsNonRunningContainers()
    {
        var containers = new List<ContainerListResponse>
        {
            new() { ID = "c-running", State = "running" },
            new() { ID = "c-stopped", State = "exited" },
        };
        this._fixture.ContainerResponses = containers;

        var result = await this.Orchestrator.GetStoppedContainers();

        Assert.That(result, Has.Count.EqualTo(1));
        Assert.That(result[0].ID, Is.EqualTo("c-stopped"));
    }

    [Test]
    public async Task FindContainers_ReturnsMatchingContainers()
    {
        var containers = new List<ContainerListResponse> { new() { ID = "c-1" } };
        this._fixture.ContainerResponses = containers;

        var result = await this.Orchestrator.FindContainers(new ContainersListParameters { All = true });

        Assert.That(result, Has.Count.EqualTo(1));
        Assert.That(result[0].ID, Is.EqualTo("c-1"));
    }

    [Test]
    public async Task FindFirstContainer_ReturnsFirstMatchingContainer()
    {
        var containers = new List<ContainerListResponse>
        {
            new() { ID = "c-first" },
            new() { ID = "c-second" },
        };
        this._fixture.ContainerResponses = containers;

        var result = await this.Orchestrator.FindFirstContainer(new ContainersListParameters { All = true });

        Assert.That(result.IsSome);
        result.IfSome(container => Assert.That(container.ID, Is.EqualTo("c-first")));
    }

    [Test]
    public async Task GetContainerById_ReturnsMatchingContainer()
    {
        var containers = new List<ContainerListResponse> { new() { ID = "c-1" } };
        this._fixture.ContainerResponses = containers;

        var result = await this.Orchestrator.GetContainerById("c-1");

        Assert.That(result.IsSome);
        result.IfSome(container => Assert.That(container.ID, Is.EqualTo("c-1")));
    }

    [Test]
    public async Task CreateContainer_SetsImageAndNameAndReturnsCreatedContainer()
    {
        const string imageId = "sha256:4ee5a832ef6e";
        const string containerName = "test-app";

        var result = await this.Orchestrator.CreateContainer(imageId, containerName);

        Assert.That(result.IsSome);
        result.IfSome(response => Assert.That(response.ID, Is.EqualTo(this._fixture.CreateContainerResponse.ID)));
        this._fixture.Containers.Verify(
            c =>
                c.CreateContainerAsync(
                    It.Is<CreateContainerParameters>(p => p.Image == imageId && p.Name == containerName),
                    default
                ),
            Times.Once
        );
    }

    [Test]
    public async Task StartContainer_WhenContainerExists_ReturnsTrue()
    {
        const string containerId = "c-1";
        this._fixture.ContainerResponses = [new() { ID = containerId }];

        var result = await this.Orchestrator.StartContainer(containerId);

        Assert.That(result, Is.True);
    }

    [Test]
    public async Task StopContainer_WhenContainerExists_ReturnsTrue()
    {
        const string containerId = "c-1";
        this._fixture.ContainerResponses = [new() { ID = containerId }];

        var result = await this.Orchestrator.StopContainer(containerId);

        Assert.That(result, Is.True);
    }

    [Test]
    public async Task DeleteContainer_WhenContainerExists_RemovesContainerAndReturnsTrue()
    {
        const string containerId = "c-1";
        this._fixture.ContainerResponses = [new() { ID = containerId }];

        var result = await this.Orchestrator.DeleteContainer(containerId);

        Assert.That(result, Is.True);
    }

    [Test]
    public async Task GetAllImages_ReturnsImages()
    {
        const string imageId = "sha256:4ee5a832ef6e";
        var images = new List<ImagesListResponse> { new() { ID = imageId } };
        this._fixture.ImageResponses = images;

        var result = await this.Orchestrator.GetAllImages();

        Assert.That(result, Has.Count.EqualTo(1));
        Assert.That(result[0].ID, Is.EqualTo(imageId));
    }

    [Test]
    public async Task GetImageById_ReturnsMatchingImage()
    {
        const string imageId = "sha256:4ee5a832ef6e";
        var images = new List<ImagesListResponse> { new() { ID = imageId } };
        this._fixture.ImageResponses = images;

        var result = await this.Orchestrator.GetImageById("4ee5a832ef6e");

        Assert.That(result.IsSome);
        result.IfSome(image => Assert.That(image.ID, Is.EqualTo(imageId)));
    }

    [Test]
    public async Task GetImageByName_ReturnsMatchingImage()
    {
        const string imageId = "sha256:4ee5a832ef6e";
        const string imageName = "my-image:latest";
        var images = new List<ImagesListResponse>
        {
            new() { ID = imageId, RepoTags = [imageName] },
        };

        this._fixture.ImageResponses = images;

        var result = await this.Orchestrator.GetImageByName(imageName);

        Assert.That(result.IsSome);
        result.IfSome(image => Assert.That(image.ID, Is.EqualTo(imageId)));
    }

    [Test]
    public async Task StartContainer_WhenContainerDoesNotExist_ReturnsFalse()
    {
        bool result = await this.Orchestrator.StartContainer("non-existent");
        Assert.That(result, Is.False);
    }

    [Test]
    public async Task StartContainer_WhenDockerApiException_ReturnsFalse()
    {
        this.ContainerOperationsMock.Setup(c => c.ListContainersAsync(It.IsAny<ContainersListParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.BadRequest, "Bad Request"));

        bool result = await this.Orchestrator.StartContainer("c-1");
        Assert.That(result, Is.False);
    }

    [Test]
    public async Task StartContainer_WhenGenericException_ReturnsFalse()
    {
        this._fixture.ContainerResponses = [new() { ID = "c-1", State = "exited" }];
        this.ContainerOperationsMock.Setup(c =>
                c.StartContainerAsync("c-1", It.IsAny<ContainerStartParameters>(), default)
            )
            .ThrowsAsync(new Exception("Unexpected"));

        bool result = await this.Orchestrator.StartContainer("c-1");
        Assert.That(result, Is.False);
    }

    [Test]
    public async Task StopContainer_WhenContainerDoesNotExist_ReturnsFalse()
    {
        bool result = await this.Orchestrator.StopContainer("non-existent");
        Assert.That(result, Is.False);
    }

    [Test]
    public async Task StopContainer_WhenDockerApiException_ReturnsFalse()
    {
        this._fixture.ContainerResponses = [new() { ID = "c-1", State = "running" }];
        this.ContainerOperationsMock.Setup(c =>
                c.StopContainerAsync("c-1", It.IsAny<ContainerStopParameters>(), default)
            )
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        bool result = await this.Orchestrator.StopContainer("c-1");
        Assert.That(result, Is.False);
    }

    [Test]
    public async Task GetAllImages_WhenDockerApiException_ReturnsEmptyList()
    {
        this.ImagesOperationsMock.Setup(i => i.ListImagesAsync(It.IsAny<ImagesListParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        var result = await this.Orchestrator.GetAllImages();
        Assert.That(result, Is.Empty);
    }

    [Test]
    public async Task GetImageById_ReturnsImageWhenIdMatchesExactly()
    {
        this._fixture.ImageResponses = [new() { ID = "sha256:1234567890" }];

        var result = await this.Orchestrator.GetImageById("sha256:1234567890");

        Assert.That(result.IsSome, Is.True);
    }

    [Test]
    public async Task GetImageById_ReturnsImageWhenIdIsContained()
    {
        this._fixture.ImageResponses = [new() { ID = "sha256:1234567890" }];

        var result = await this.Orchestrator.GetImageById("123456");

        Assert.That(result.IsSome, Is.True);
    }

    [Test]
    public async Task GetImageById_ReturnsNoneWhenImageDoesNotExist()
    {
        var result = await this.Orchestrator.GetImageById("non-matching-id");

        Assert.That(result.IsNone, Is.True);
    }

    [Test]
    public async Task CreateContainer_WhenDockerApiException_ReturnsNone()
    {
        this.ContainerOperationsMock.Setup(c => c.CreateContainerAsync(It.IsAny<CreateContainerParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.BadRequest, "Bad Request"));

        var result = await this.Orchestrator.CreateContainer("img-id", "name");
        Assert.That(result.IsNone, Is.True);
    }

    [Test]
    public async Task CreateContainer_WhenGenericException_ReturnsNone()
    {
        this.ContainerOperationsMock.Setup(c => c.CreateContainerAsync(It.IsAny<CreateContainerParameters>(), default))
            .ThrowsAsync(new Exception("Unexpected"));

        var result = await this.Orchestrator.CreateContainer("img-id", "name");
        Assert.That(result.IsNone, Is.True);
    }

    [Test]
    public async Task DeleteContainer_WhenContainerDoesNotExist_ReturnsFalse()
    {
        bool result = await this.Orchestrator.DeleteContainer("non-existent");
        Assert.That(result, Is.False);
    }

    [Test]
    public async Task DeleteContainer_WhenDockerApiException_ReturnsFalse()
    {
        this._fixture.ContainerResponses = [new() { ID = "c-1", State = "exited" }];
        this.ContainerOperationsMock.Setup(c =>
                c.RemoveContainerAsync("c-1", It.IsAny<ContainerRemoveParameters>(), default)
            )
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        bool result = await this.Orchestrator.DeleteContainer("c-1");
        Assert.That(result, Is.False);
    }
}
