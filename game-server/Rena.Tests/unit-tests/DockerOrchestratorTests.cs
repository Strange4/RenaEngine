using System.IO.Compression;
using Docker.DotNet;
using Docker.DotNet.Models;
using LanguageExt.Common;
using Moq;
using Rena.Generator;
using Rena.Server.DockerManager;

namespace Rena.Tests.Unit;

[TestFixture]
[Category("Unit")]
public class DockerOrchestratorTests
{
    private DockerServicesFixture _fixture = null!;
    private DockerService _service = null!;

    [SetUp]
    public void SetUp()
    {
        this._fixture = new DockerServicesFixture();
        this._service = new DockerService(this._fixture.DockerClient.Object, this._fixture.Logger.Object);
    }

    [TearDown]
    public void TearDown() => this._fixture.Dispose();

    private static bool IsSuccess<T>(Result<T> result) => result.Match(_ => true, _ => false);

    private static bool IsFailure<T>(Result<T> result) => result.Match(_ => false, _ => true);

    [Test]
    public async Task CreateOrReplaceImageAsync_BuildsZipContextAndReturnsImageTag()
    {
        string directory = Path.Combine(Path.GetTempPath(), $"docker-orchestrator-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        string zipPath = Path.Combine(directory, "player.zip");
        string dockerfilePath = Path.Combine(directory, "Dockerfile");
        using (var archive = await ZipFile.OpenAsync(zipPath, ZipArchiveMode.Create))
        {
            await using var entry = await archive.CreateEntry("app.js").OpenAsync();
            await using var writer = new StreamWriter(entry);
            await writer.WriteAsync("console.log('ready');");
        }
        await File.WriteAllTextAsync(dockerfilePath, "FROM scratch");

        try
        {
            var result = await this._service.CreateOrReplaceImageAsync("player-123", zipPath, dockerfilePath);

            Assert.That(IsSuccess(result), Is.True);
            result.IfSucc(imageId => Assert.That(imageId, Is.EqualTo("player-123")));
            this._fixture.Images.Verify(
                operations =>
                    operations.BuildImageFromDockerfileAsync(
                        It.Is<ImageBuildParameters>(parameters => parameters.Dockerfile == "Dockerfile" && parameters.Tags.Contains("player-123")),
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
    public async Task CreateOrReplaceImageAsync_UsesStrategyRegisteredForLanguage()
    {
        string directory = Path.Combine(Path.GetTempPath(), $"docker-orchestrator-strategy-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        string zipPath = Path.Combine(directory, "player.zip");
        string dockerfilePath = Path.Combine(directory, "Dockerfile");
        using (var archive = await ZipFile.OpenAsync(zipPath, ZipArchiveMode.Create))
        {
            await using var entry = await archive.CreateEntry("app.ts").OpenAsync();
            await using var writer = new StreamWriter(entry);
            await writer.WriteAsync("console.log('ready');");
        }
        await File.WriteAllTextAsync(dockerfilePath, "FROM scratch");

        string languageName = SDKBuilder.AvailableLanguageGenerators().Single();
        var strategy = new TestDockerBuildContextStrategy(languageName);
        var service = new DockerService(this._fixture.DockerClient.Object, this._fixture.Logger.Object, [strategy]);

        try
        {
            var result = await service.CreateOrReplaceImageAsync("player-123", zipPath, dockerfilePath, languageName);

            Assert.That(IsSuccess(result), Is.True);
            Assert.That(strategy.Request?.Language, Is.EqualTo(languageName));
            Assert.That(strategy.LanguageName, Is.EqualTo(languageName));
            Assert.That(strategy.Request?.ImageName, Is.EqualTo("player-123"));
            Assert.That(strategy.CallCount, Is.EqualTo(1));
            this._fixture.Images.Verify(
                operations =>
                    operations.BuildImageFromDockerfileAsync(
                        It.Is<ImageBuildParameters>(parameters => parameters.Tags.Contains("player-123")),
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
    public async Task CreateOrReplaceImageAsync_ReturnsFailureWhenLanguageIsNotAvailableFromSdkGenerator()
    {
        string directory = Path.Combine(Path.GetTempPath(), $"docker-orchestrator-unsupported-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        string zipPath = Path.Combine(directory, "player.zip");
        string dockerfilePath = Path.Combine(directory, "Dockerfile");
        using (var archive = await ZipFile.OpenAsync(zipPath, ZipArchiveMode.Create))
        {
            await using var entry = await archive.CreateEntry("app.ts").OpenAsync();
            await using var writer = new StreamWriter(entry);
            await writer.WriteAsync("console.log('ready');");
        }
        await File.WriteAllTextAsync(dockerfilePath, "FROM scratch");

        try
        {
            var result = await this._service.CreateOrReplaceImageAsync("player-123", zipPath, dockerfilePath, "java");

            Assert.That(IsFailure(result), Is.True);
            this._fixture.Images.Verify(
                operations =>
                    operations.BuildImageFromDockerfileAsync(
                        It.IsAny<ImageBuildParameters>(),
                        It.IsAny<Stream>(),
                        It.IsAny<IEnumerable<AuthConfig>>(),
                        It.IsAny<IDictionary<string, string>>(),
                        It.IsAny<IProgress<JSONMessage>>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    [Test]
    public async Task CreateOrReplaceImageAsync_ReturnsFailureWhenAvailableLanguageHasNoStrategy()
    {
        string directory = Path.Combine(Path.GetTempPath(), $"docker-orchestrator-no-strategy-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        string zipPath = Path.Combine(directory, "player.zip");
        string dockerfilePath = Path.Combine(directory, "Dockerfile");
        using (var archive = await ZipFile.OpenAsync(zipPath, ZipArchiveMode.Create))
        {
            await using var entry = await archive.CreateEntry("app.ts").OpenAsync();
            await using var writer = new StreamWriter(entry);
            await writer.WriteAsync("console.log('ready');");
        }
        await File.WriteAllTextAsync(dockerfilePath, "FROM scratch");

        var service = new DockerService(this._fixture.DockerClient.Object, this._fixture.Logger.Object, []);

        try
        {
            string availableLanguage = SDKBuilder.AvailableLanguageGenerators().Single();
            var result = await service.CreateOrReplaceImageAsync("player-123", zipPath, dockerfilePath, availableLanguage);

            Assert.That(IsFailure(result), Is.True);
            this._fixture.Images.Verify(
                operations =>
                    operations.BuildImageFromDockerfileAsync(
                        It.IsAny<ImageBuildParameters>(),
                        It.IsAny<Stream>(),
                        It.IsAny<IEnumerable<AuthConfig>>(),
                        It.IsAny<IDictionary<string, string>>(),
                        It.IsAny<IProgress<JSONMessage>>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    [Test]
    public async Task CreateOrReplaceImageAsync_ReturnsFailureWhenInputsAreMissing()
    {
        var result = await this._service.CreateOrReplaceImageAsync("player-123", "missing.zip", "missing.Dockerfile");

        Assert.That(IsFailure(result), Is.True);
        this._fixture.Images.Verify(
            operations =>
                operations.BuildImageFromDockerfileAsync(
                    It.IsAny<ImageBuildParameters>(),
                    It.IsAny<Stream>(),
                    It.IsAny<IEnumerable<AuthConfig>>(),
                    It.IsAny<IDictionary<string, string>>(),
                    It.IsAny<IProgress<JSONMessage>>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Test]
    public async Task CreateAndStartContainerWithIdAsync_CreatesAndStartsContainer()
    {
        this._fixture.ContainerResponses = [new() { ID = this._fixture.CreateContainerResponse.ID }];

        var result = await this._service.CreateAndStartContainerWithIdAsync("player-123", "image-123");

        Assert.That(IsSuccess(result), Is.True);
        this._fixture.Containers.Verify(
            operations =>
                operations.CreateContainerAsync(
                    It.Is<CreateContainerParameters>(parameters => parameters.Name == "player-123" && parameters.Image == "image-123"),
                    default
                ),
            Times.Once
        );
        this._fixture.Containers.Verify(
            operations => operations.StartContainerAsync(this._fixture.CreateContainerResponse.ID, It.IsAny<ContainerStartParameters>(), default),
            Times.Once
        );
    }

    [Test]
    public async Task CreateAndStartContainerWithIdAsync_DoesNotStartWhenCreationFails()
    {
        this._fixture.Containers.Setup(operations => operations.CreateContainerAsync(It.IsAny<CreateContainerParameters>(), default))
            .ThrowsAsync(new DockerApiException(System.Net.HttpStatusCode.Conflict, "Conflict"));

        var result = await this._service.CreateAndStartContainerWithIdAsync("player-123", "image-123");

        Assert.That(IsFailure(result), Is.True);
        this._fixture.Containers.Verify(
            operations => operations.StartContainerAsync(It.IsAny<string>(), It.IsAny<ContainerStartParameters>(), default),
            Times.Never
        );
    }

    [Test]
    public async Task StartContainerWithIdAsync_DelegatesToContainerService()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];

        var result = await this._service.StartContainerWithIdAsync("container-123");

        Assert.That(IsSuccess(result), Is.True);
        this._fixture.Containers.Verify(
            operations => operations.StartContainerAsync("container-123", It.IsAny<ContainerStartParameters>(), default),
            Times.Once
        );
    }

    [Test]
    public async Task KillContainerWithIdAsync_StopsContainer()
    {
        this._fixture.ContainerResponses = [new() { ID = "container-123" }];

        var result = await this._service.KillContainerWithIdAsync("container-123");

        Assert.That(IsSuccess(result), Is.True);
        this._fixture.Containers.Verify(
            operations => operations.StopContainerAsync("container-123", It.IsAny<ContainerStopParameters>(), default),
            Times.Once
        );
    }

    private sealed class TestDockerBuildContextStrategy(string languageName) : IDockerBuildContextStrategy
    {
        public string LanguageName => languageName;
        public DockerImageBuildRequest? Request { get; private set; }
        public int CallCount { get; private set; }

        public Task<Result<IDockerBuildContext>> CreateAsync(DockerImageBuildRequest request, CancellationToken cancellationToken = default)
        {
            this.Request = request;
            this.CallCount++;
            return Task.FromResult<Result<IDockerBuildContext>>(new TestDockerBuildContext());
        }
    }

    private sealed class TestDockerBuildContext : IDockerBuildContext
    {
        public Stream Content { get; } = new MemoryStream();

        public async ValueTask DisposeAsync()
        {
            await this.Content.DisposeAsync();
        }
    }
}
