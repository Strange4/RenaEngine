using Docker.DotNet;
using Docker.DotNet.Models;

using Moq;

namespace DockerOrchestrator.Tests;

[TestFixture]
public class OrchestratorTests
{
    private Mock<IDockerClient> _dockerClientMock;
    private Mock<IContainerOperations> _containerOperationsMock;
    private Mock<IImageOperations> _imagesOperationsMock;
    private Orchestrator _orchestrator;

    [SetUp]
    public void SetUp()
    {
        _dockerClientMock = new Mock<IDockerClient>();
        _containerOperationsMock = new Mock<IContainerOperations>();
        _imagesOperationsMock = new Mock<IImageOperations>();

        _dockerClientMock.Setup(client => client.Containers).Returns(_containerOperationsMock.Object);
        _dockerClientMock.Setup(client => client.Images).Returns(_imagesOperationsMock.Object);

        _orchestrator = new Orchestrator(_dockerClientMock.Object);
    }

    [Test]
    public async Task ContainerQueries_ShouldSuccessfullyListFindAndGetContainers()
    {
        var runningList = new List<ContainerListResponse> { new() { ID = "c-running", State = "running" } };
        var stoppedList = new List<ContainerListResponse> { new() { ID = "c-stopped", State = "exited" } };
        var allList = new List<ContainerListResponse> { runningList[0], stoppedList[0] };

        _containerOperationsMock
            .Setup(c => c.ListContainersAsync(It.Is<ContainersListParameters>(p => p.All == false), default))
            .ReturnsAsync(runningList);

        _containerOperationsMock
            .Setup(c => c.ListContainersAsync(It.Is<ContainersListParameters>(p => p.All == true), default))
            .ReturnsAsync(allList);

        _containerOperationsMock
            .Setup(c => c.ListContainersAsync(It.Is<ContainersListParameters>(p => p.Filters != null), default))
            .ReturnsAsync(stoppedList);

        var running = await _orchestrator.GetRunningContainers();
        var stopped = await _orchestrator.GetStoppedContainers();
        Assert.That(running, Has.Count.EqualTo(1));
        using (Assert.EnterMultipleScope())
        {
            Assert.That(running[0].ID, Is.EqualTo("c-running"));
            Assert.That(stopped, Has.Count.EqualTo(1));
            Assert.That(stopped[0].ID, Is.EqualTo("c-stopped"));
        }

        var foundContainers = await _orchestrator.FindContainers(new ContainersListParameters { All = true });
        var firstContainer = await _orchestrator.FindFirstContainer(new ContainersListParameters { All = true });
        using (Assert.EnterMultipleScope())
        {
            Assert.That(foundContainers, Has.Count.EqualTo(2));
            Assert.That(firstContainer.IsSome);
        }


        var containerById = await _orchestrator.GetContainerById("c-stopped");
        Assert.That(containerById.IsSome);
        containerById.Match(
            Some: c => Assert.That(c.ID, Is.EqualTo("c-stopped")),
            None: () => Assert.Fail("Container should have been found by ID.")
        );
    }

    [Test]
    public async Task ContainerLifecycle_CreateStartStopAndDelete_ShouldSucceedThroughCompleteWorkflow()
    {
        string imageId = "sha256:4ee5a832ef6e";
        string containerId = "container-xyz";
        string containerName = "test-app";

        var imageList = new List<ImagesListResponse> { new() { ID = imageId } };
        var containerListForCheck = new List<ContainerListResponse> { new() { ID = containerId, State = "exited" } };

        _imagesOperationsMock
            .Setup(i => i.ListImagesAsync(It.IsAny<ImagesListParameters>(), default))
            .ReturnsAsync(imageList);

        _containerOperationsMock
            .Setup(c => c.CreateContainerAsync(It.Is<CreateContainerParameters>(p => p.Image == imageId && p.Name == containerName), default))
            .ReturnsAsync(new CreateContainerResponse { ID = containerId });

        _containerOperationsMock
            .Setup(c => c.ListContainersAsync(It.IsAny<ContainersListParameters>(), default))
            .ReturnsAsync(containerListForCheck);

        _containerOperationsMock
            .Setup(c => c.StartContainerAsync(containerId, It.IsAny<ContainerStartParameters>(), default))
            .ReturnsAsync(true);

        _containerOperationsMock
            .Setup(c => c.StopContainerAsync(containerId, It.IsAny<ContainerStopParameters>(), default))
            .ReturnsAsync(true);

        _containerOperationsMock
            .Setup(c => c.RemoveContainerAsync(containerId, It.IsAny<ContainerRemoveParameters>(), default))
            .Returns(Task.CompletedTask);

        var imageOpt = await _orchestrator.GetImageById("4ee5a832ef6e");
        Assert.That(imageOpt.IsSome);

        var createOpt = await _orchestrator.CreateContainer(imageId, containerName);
        Assert.That(createOpt.IsSome);
        string createdId = "";
        createOpt.IfSome(resp => createdId = resp.ID);
        Assert.That(createdId, Is.EqualTo(containerId));

        bool started = await _orchestrator.StartContainer(containerId);
        Assert.That(started);

        bool stopped = await _orchestrator.StopContainer(containerId);
        Assert.That(stopped);

        bool deleted = await _orchestrator.DeleteContainer(containerId);
        Assert.That(deleted);
    }

    [Test]
    public async Task ImageOperations_GetAllGetByIdAndGetByName_ShouldSucceed()
    {
        string imageId = "sha256:4ee5a832ef6e";
        string imageName = "my-image:latest";
        var images = new List<ImagesListResponse>
        {
            new() { ID = imageId, RepoTags = [imageName] }
        };

        _imagesOperationsMock
            .Setup(i => i.ListImagesAsync(It.IsAny<ImagesListParameters>(), default))
            .ReturnsAsync(images);

        var allImages = await _orchestrator.GetAllImages();
        Assert.That(allImages, Has.Count.EqualTo(1));

        var imageById = await _orchestrator.GetImageById("4ee5a832ef6e");
        Assert.That(imageById.IsSome);
        imageById.Match(
            Some: img => Assert.That(img.ID, Is.EqualTo(imageId)),
            None: () => Assert.Fail("Image should have been found by ID.")
        );

        var imageByName = await _orchestrator.GetImageByName(imageName);
        Assert.That(imageByName.IsSome);
        imageByName.Match(
            Some: img => Assert.That(img.ID, Is.EqualTo(imageId)),
            None: () => Assert.Fail("Image should have been found by name.")
        );
    }
}
