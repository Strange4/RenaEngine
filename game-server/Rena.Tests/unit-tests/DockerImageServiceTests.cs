using Docker.DotNet;
using Docker.DotNet.Models;

using Moq;

using Rena.Server.DockerManager;

namespace Rena.Tests.Unit;

[TestFixture]
[Category("Unit")]
public class DockerImageServiceTests
{
    private DockerServicesFixture _fixture = null!;
    private DockerImageService _service = null!;

    [SetUp]
    public void SetUp()
    {
        this._fixture = new DockerServicesFixture();
        this._service = new DockerImageService(this._fixture.DockerClient.Object, this._fixture.Logger.Object);
    }

    [TearDown]
    public void TearDown() => this._fixture.Dispose();

    [Test]
    public async Task FindImageByIdAsync_FindsExactOrPartialId()
    {
        const string imageId = "sha256:1234567890";
        this._fixture.ImageResponses = [new() { ID = imageId }];

        var result = await this._service.FindImageByIdAsync("123456");

        Assert.That(result.IsSome, Is.True);
        result.IfSome(image => Assert.That(image.ID, Is.EqualTo(imageId)));
    }

    [Test]
    public async Task FindImageByIdAsync_ReturnsNoneWhenImageIsMissing()
    {
        var result = await this._service.FindImageByIdAsync("missing");

        Assert.That(result.IsNone, Is.True);
    }

    [Test]
    public async Task FindImageByIdAsync_ReturnsNoneWhenListingImagesFails()
    {
        this._fixture.Images
            .Setup(operations => operations.ListImagesAsync(It.IsAny<ImagesListParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        var result = await this._service.FindImageByIdAsync("image-123");

        Assert.That(result.IsNone, Is.True);
    }

    [Test]
    public async Task DeleteImageAsync_WhenImageExistsUsesDefaultDeleteParameters()
    {
        const string imageId = "sha256:1234567890";
        this._fixture.ImageResponses = [new() { ID = imageId }];

        bool result = await this._service.DeleteImageAsync(imageId);

        Assert.That(result, Is.True);
        this._fixture.Images.Verify(operations => operations.DeleteImageAsync(
            imageId,
            It.Is<ImageDeleteParameters>(parameters => parameters.Force == true && parameters.NoPrune == false)), Times.Once);
    }

    [Test]
    public async Task DeleteImageAsync_WhenImageDoesNotExistReturnsFalse()
    {
        bool result = await this._service.DeleteImageAsync("missing");

        Assert.That(result, Is.False);
        this._fixture.Images.Verify(operations => operations.DeleteImageAsync(
            It.IsAny<string>(), It.IsAny<ImageDeleteParameters>()), Times.Never);
    }

    [Test]
    public async Task DeleteImageAsync_WhenDockerApiFailsReturnsFalse()
    {
        this._fixture.ImageResponses = [new() { ID = "image-123" }];
        this._fixture.Images
            .Setup(operations => operations.DeleteImageAsync(
                It.IsAny<string>(), It.IsAny<ImageDeleteParameters>()))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        bool result = await this._service.DeleteImageAsync("image-123");

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task CreateImageAsync_BuildsDockerfileWithTagAndBuildArguments()
    {
        string contextPath = Path.Combine(Path.GetTempPath(), $"docker-context-{Guid.NewGuid():N}");
        Directory.CreateDirectory(contextPath);
        string dockerfilePath = Path.Combine(contextPath, "Dockerfile");
        await File.WriteAllTextAsync(dockerfilePath, "FROM scratch");
        Dictionary<string, string> buildArgs = new() { ["VERSION"] = "1.2.3" };

        try
        {
            bool result = await this._service.CreateImageAsync(
                dockerfilePath, "test-image:latest", contextPath, buildArgs);

            Assert.That(result, Is.True);
            this._fixture.Images.Verify(operations => operations.BuildImageFromDockerfileAsync(
                It.Is<ImageBuildParameters>(parameters =>
                    parameters.Dockerfile == "Dockerfile" &&
                    parameters.Tags.Contains("test-image:latest") &&
                    parameters.BuildArgs == buildArgs),
                It.IsAny<Stream>(),
                It.IsAny<IEnumerable<AuthConfig>>(),
                It.IsAny<IDictionary<string, string>>(),
                It.IsAny<IProgress<JSONMessage>>(),
                It.IsAny<CancellationToken>()), Times.Once);
        }
        finally
        {
            Directory.Delete(contextPath, recursive: true);
        }
    }

    [Test]
    public async Task CreateImageAsync_RejectsDockerfileOutsideBuildContext()
    {
        string parentPath = Path.Combine(Path.GetTempPath(), $"docker-context-{Guid.NewGuid():N}");
        string contextPath = Path.Combine(parentPath, "context");
        Directory.CreateDirectory(contextPath);
        string dockerfilePath = Path.Combine(parentPath, "Dockerfile");
        await File.WriteAllTextAsync(dockerfilePath, "FROM scratch");

        try
        {
            bool result = await this._service.CreateImageAsync(dockerfilePath, "test-image:latest", contextPath);

            Assert.That(result, Is.False);
            this._fixture.Images.Verify(operations => operations.BuildImageFromDockerfileAsync(
                It.IsAny<ImageBuildParameters>(),
                It.IsAny<Stream>(),
                It.IsAny<IEnumerable<AuthConfig>>(),
                It.IsAny<IDictionary<string, string>>(),
                It.IsAny<IProgress<JSONMessage>>(),
                It.IsAny<CancellationToken>()), Times.Never);
        }
        finally
        {
            Directory.Delete(parentPath, recursive: true);
        }
    }

    [Test]
    public async Task CreateImageAsync_ReturnsFalseForNullRequiredInputs()
    {
        Assert.That(await this._service.CreateImageAsync(null!, "test-image:latest"), Is.False);

        string dockerfilePath = Path.Combine(Path.GetTempPath(), $"Dockerfile-{Guid.NewGuid():N}");
        await File.WriteAllTextAsync(dockerfilePath, "FROM scratch");
        try
        {
            Assert.That(await this._service.CreateImageAsync(dockerfilePath, null!), Is.False);
        }
        finally
        {
            File.Delete(dockerfilePath);
        }
    }
}
