using Docker.DotNet;
using Docker.DotNet.Models;
using LanguageExt.Common;
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

    private static bool IsSuccess<T>(Result<T> result) => result.Match(_ => true, _ => false);

    private static bool IsFailure<T>(Result<T> result) => result.Match(_ => false, _ => true);

    [Test]
    public async Task FindImageByIdAsync_FindsExactOrPartialId()
    {
        const string imageId = "sha256:1234567890";
        this._fixture.ImageResponses = [new() { ID = imageId }];

        var result = await this._service.FindImageByIdAsync("123456");

        Assert.That(IsSuccess(result), Is.True);
        result.IfSucc(image => Assert.That(image.ID, Is.EqualTo(imageId)));
    }

    [Test]
    public async Task FindImageByIdAsync_ReturnsFailureWhenImageIsMissing()
    {
        var result = await this._service.FindImageByIdAsync("missing");

        Assert.That(IsFailure(result), Is.True);
    }

    [Test]
    public async Task FindImageByIdAsync_ReturnsFailureWhenListingImagesFails()
    {
        this._fixture.Images.Setup(operations => operations.ListImagesAsync(It.IsAny<ImagesListParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        var result = await this._service.FindImageByIdAsync("image-123");

        Assert.That(IsFailure(result), Is.True);
    }

    [Test]
    public async Task DeleteImageAsync_WhenImageExistsUsesDefaultDeleteParameters()
    {
        const string imageId = "sha256:1234567890";
        this._fixture.ImageResponses = [new() { ID = imageId }];

        var result = await this._service.DeleteImageAsync(imageId);

        Assert.That(IsSuccess(result), Is.True);
        this._fixture.Images.Verify(
            operations =>
                operations.DeleteImageAsync(
                    imageId,
                    It.Is<ImageDeleteParameters>(parameters => parameters.Force == true && parameters.NoPrune == false)
                ),
            Times.Once
        );
    }

    [Test]
    public async Task DeleteImageAsync_WhenImageDoesNotExistReturnsFailure()
    {
        var result = await this._service.DeleteImageAsync("missing");

        Assert.That(IsFailure(result), Is.True);
        this._fixture.Images.Verify(operations => operations.DeleteImageAsync(It.IsAny<string>(), It.IsAny<ImageDeleteParameters>()), Times.Never);
    }

    [Test]
    public async Task DeleteImageAsync_WhenDockerApiFailsReturnsFailure()
    {
        this._fixture.ImageResponses = [new() { ID = "image-123" }];
        this._fixture.Images.Setup(operations => operations.DeleteImageAsync(It.IsAny<string>(), It.IsAny<ImageDeleteParameters>()))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.InternalServerError, "Error"));

        var result = await this._service.DeleteImageAsync("image-123");

        Assert.That(IsFailure(result), Is.True);
    }

    [Test]
    public async Task CreateImageAsync_BuildsDockerfileWithTagAndBuildArgumentsAndDisposesBuildContext()
    {
        Dictionary<string, string> buildArgs = new() { ["VERSION"] = "1.2.3" };
        string directory = Path.Combine(Path.GetTempPath(), $"docker-image-service-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        string archivePath = Path.Combine(directory, "player.zip");
        string buildContextPath = Path.Combine(directory, "context.tar");
        await File.WriteAllBytesAsync(archivePath, []);
        await File.WriteAllBytesAsync(buildContextPath, []);
        var request = new DockerImageBuildRequest
        {
            ImageName = "test-image:latest",
            Dockerfile = "FROM scratch",
            FilesArchivePath = archivePath,
            Language = "typescript",
            BuildArgs = buildArgs,
        };
        Stream? usedBuildContext = null;
        this._fixture.Images.Setup(operations =>
                operations.BuildImageFromDockerfileAsync(
                    It.IsAny<ImageBuildParameters>(),
                    It.IsAny<Stream>(),
                    It.IsAny<IEnumerable<AuthConfig>>(),
                    It.IsAny<IDictionary<string, string>>(),
                    It.IsAny<IProgress<JSONMessage>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<ImageBuildParameters, Stream, IEnumerable<AuthConfig>, IDictionary<string, string>, IProgress<JSONMessage>, CancellationToken>(
                (_, stream, _, _, _, _) => usedBuildContext = stream
            )
            .Returns(Task.CompletedTask);

        try
        {
            var result = await this._service.CreateImageAsync(request, buildContextPath);

            Assert.That(IsSuccess(result), Is.True);
            Assert.That(usedBuildContext, Is.Not.Null);
            Assert.That(usedBuildContext!.CanRead, Is.False);
            this._fixture.Images.Verify(
                operations =>
                    operations.BuildImageFromDockerfileAsync(
                        It.Is<ImageBuildParameters>(parameters =>
                            parameters.Dockerfile == "Dockerfile"
                            && parameters.Tags.Contains("test-image:latest")
                            && parameters.BuildArgs == buildArgs
                        ),
                        It.IsAny<Stream>(),
                        It.IsAny<IEnumerable<AuthConfig>>(),
                        It.IsAny<IDictionary<string, string>>(),
                        It.IsAny<IProgress<JSONMessage>>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    [Test]
    public async Task CreateImageAsync_ReturnsFailureWhenDockerReportsBuildErrors()
    {
        string directory = Path.Combine(Path.GetTempPath(), $"docker-image-service-error-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        string buildContextPath = Path.Combine(directory, "context.tar");
        await File.WriteAllBytesAsync(buildContextPath, []);
        var request = new DockerImageBuildRequest
        {
            ImageName = "test-image:latest",
            Dockerfile = "FROM scratch",
            FilesArchivePath = Path.Combine(directory, "player.zip"),
            Language = "typescript",
        };
        this._fixture.Images.Setup(operations =>
                operations.BuildImageFromDockerfileAsync(
                    It.IsAny<ImageBuildParameters>(),
                    It.IsAny<Stream>(),
                    It.IsAny<IEnumerable<AuthConfig>>(),
                    It.IsAny<IDictionary<string, string>>(),
                    It.IsAny<IProgress<JSONMessage>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<ImageBuildParameters, Stream, IEnumerable<AuthConfig>, IDictionary<string, string>, IProgress<JSONMessage>, CancellationToken>(
                (_, _, _, _, progress, _) => progress.Report(new JSONMessage { Error = new JSONError { Message = "Build failed" } })
            )
            .Returns(Task.CompletedTask);

        try
        {
            var result = await this._service.CreateImageAsync(request, buildContextPath);
            Assert.That(IsFailure(result), Is.True);
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }
}
