using System.IO.Compression;
using Docker.DotNet;
using Docker.DotNet.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Rena.Server.DockerManager;

namespace Rena.Tests.Integration;

[TestFixture]
[Category("Integration")]
public sealed class DockerOrchestratorIntegrationTests
{
    private DockerApiStub _api = null!;
    private IDockerClient _dockerClient = null!;
    private AbstractDockerService _orchestrator = null!;

    [SetUp]
    public async Task SetUp()
    {
        this._api = new DockerApiStub();
        await this._api.StartAsync();
        this._dockerClient = new DockerClientConfiguration(this._api.Endpoint).CreateClient();
        this._orchestrator = new AbstractDockerService(this._dockerClient, NullLogger.Instance);
    }

    [TearDown]
    public async Task TearDown()
    {
        this._dockerClient.Dispose();
        await this._api.DisposeAsync();
    }

    [Test]
    public async Task Orchestrator_BuildsAndRunsZippedScript_ThenStopsContainer()
    {
        string id = Guid.NewGuid().ToString("N");
        string imageName = $"rena-orchestrator-test:{id}";
        string containerName = $"rena-orchestrator-test-{id}";
        string directory = Path.Combine(Path.GetTempPath(), $"rena-docker-integration-{id}");
        Directory.CreateDirectory(directory);

        string archivePath = Path.Combine(directory, "player.zip");
        string dockerfilePath = Path.Combine(directory, "Dockerfile");
        const string expectedOutput = "zip-payload-executed";
        const string script = "#!/bin/sh\ncat /payload.txt\n";

        try
        {
            using (var archive = await ZipFile.OpenAsync(archivePath, ZipArchiveMode.Create))
            {
                await using var writer = new StreamWriter(await archive.CreateEntry("run.sh").OpenAsync());
                await writer.WriteAsync(script);
            }

            using (var archive = await ZipFile.OpenAsync(archivePath, ZipArchiveMode.Update))
            {
                await using var writer = new StreamWriter(await archive.CreateEntry("payload.txt").OpenAsync());
                await writer.WriteAsync(expectedOutput);
            }

            await File.WriteAllTextAsync(
                dockerfilePath,
                "FROM busybox:1.36\nCOPY run.sh /run.sh\nCOPY payload.txt /payload.txt\nRUN chmod +x /run.sh\nCMD [\"/run.sh\"]\n"
            );

            var imageResult = await this._orchestrator.CreateOrReplaceImageAsync(imageName, archivePath, dockerfilePath);
            string? builtImageName = null;
            imageResult.IfSucc(value => builtImageName = value);
            Assert.That(builtImageName, Is.EqualTo(imageName), "The player image should build successfully.");

            var startResult = await this._orchestrator.CreateAndStartContainerWithIdAsync(containerName, imageName);
            Assert.That(startResult.Match(_ => true, _ => false), Is.True, "The container should be created and started.");

            Assert.That(this._api.ContainerRunning, Is.True, "The mock daemon should report the container as running.");
            Assert.That(this._api.ContainerOutput, Is.EqualTo(expectedOutput), "The running container should print the ZIP payload.");
            Assert.That(this._api.BuildContext, Does.ContainKey("run.sh"));
            Assert.That(this._api.BuildContext["run.sh"], Is.EqualTo(script));
            Assert.That(this._api.BuildContext, Does.ContainKey("payload.txt"));
            Assert.That(this._api.BuildContext["payload.txt"], Is.EqualTo(expectedOutput));
            Assert.That(this._api.BuildContext, Does.ContainKey("Dockerfile"));
            Assert.That(this._api.BuildContext["Dockerfile"], Does.Contain("CMD [\"/run.sh\"]"));

            using (
                var logs = await this._dockerClient.Containers.GetContainerLogsAsync(
                    this._api.ContainerId,
                    tty: false,
                    new ContainerLogsParameters { ShowStdout = true, ShowStderr = true }
                )
            )
            {
                (string stdout, string stderr) = await logs.ReadOutputToEndAsync(CancellationToken.None);
                Assert.That(stdout + stderr, Is.EqualTo(expectedOutput), "The container should log the ZIP payload.");
            }

            var stopResult = await this._orchestrator.KillContainerWithIdAsync(this._api.ContainerId);
            Assert.That(stopResult.Match(_ => true, _ => false), Is.True, "The orchestrator should stop the running container.");
            Assert.That(this._api.ContainerRunning, Is.False, "The mock daemon should report the container as stopped.");

            Assert.That(
                this._api.Requests,
                Has.Some.Matches<DockerApiRequest>(request =>
                    request.Method == "POST" && request.Path.EndsWith("/build", StringComparison.Ordinal) && request.Query["t"] == imageName
                )
            );
            Assert.That(
                this._api.Requests,
                Has.Some.Matches<DockerApiRequest>(request =>
                    request.Method == "POST"
                    && request.Path.EndsWith("/containers/create", StringComparison.Ordinal)
                    && request.ImageName == imageName
                    && request.Query["name"] == containerName
                )
            );
            Assert.That(
                this._api.Requests,
                Has.Some.Matches<DockerApiRequest>(request =>
                    request.Method == "POST" && request.Path.EndsWith($"/containers/{this._api.ContainerId}/start", StringComparison.Ordinal)
                )
            );
            Assert.That(
                this._api.Requests,
                Has.Some.Matches<DockerApiRequest>(request =>
                    request.Method == "GET" && request.Path.EndsWith($"/containers/{this._api.ContainerId}/logs", StringComparison.Ordinal)
                )
            );
            Assert.That(
                this._api.Requests,
                Has.Some.Matches<DockerApiRequest>(request =>
                    request.Method == "POST" && request.Path.EndsWith($"/containers/{this._api.ContainerId}/stop", StringComparison.Ordinal)
                )
            );
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    [Test]
    public async Task Orchestrator_MakesImageEnvironmentVariablesAvailableToPlayerScript()
    {
        string id = Guid.NewGuid().ToString("N");
        string imageName = $"rena-orchestrator-env-test:{id}";
        string containerName = $"rena-orchestrator-env-test-{id}";
        string directory = Path.Combine(Path.GetTempPath(), $"rena-docker-env-integration-{id}");
        Directory.CreateDirectory(directory);

        string archivePath = Path.Combine(directory, "player.zip");
        string dockerfilePath = Path.Combine(directory, "Dockerfile");
        const string expectedOutput = "environment-value-is-available";
        const string script = "#!/bin/sh\necho \"$PLAYER_MESSAGE\"\n";

        try
        {
            using (var archive = await ZipFile.OpenAsync(archivePath, ZipArchiveMode.Create))
            {
                await using var writer = new StreamWriter(await archive.CreateEntry("run.sh").OpenAsync());
                await writer.WriteAsync(script);
            }

            await File.WriteAllTextAsync(
                dockerfilePath,
                $"FROM busybox:1.36\nENV PLAYER_MESSAGE={expectedOutput}\nCOPY run.sh /run.sh\nRUN chmod +x /run.sh\nCMD [\"/run.sh\"]\n"
            );

            var imageResult = await this._orchestrator.CreateOrReplaceImageAsync(imageName, archivePath, dockerfilePath);
            string? builtImageName = null;
            imageResult.IfSucc(value => builtImageName = value);
            Assert.That(builtImageName, Is.EqualTo(imageName), "The player image should build successfully.");

            var startResult = await this._orchestrator.CreateAndStartContainerWithIdAsync(containerName, imageName);
            Assert.That(startResult.Match(_ => true, _ => false), Is.True, "The container should be created and started.");

            Assert.That(this._api.BuildContext["Dockerfile"], Does.Contain($"ENV PLAYER_MESSAGE={expectedOutput}"));
            Assert.That(this._api.BuildContext["run.sh"], Does.Contain("echo \"$PLAYER_MESSAGE\""));
            Assert.That(this._api.ContainerOutput, Is.EqualTo(expectedOutput + Environment.NewLine));

            using var logs = await this._dockerClient.Containers.GetContainerLogsAsync(
                this._api.ContainerId,
                tty: false,
                new ContainerLogsParameters { ShowStdout = true, ShowStderr = true }
            );
            (string stdout, string stderr) = await logs.ReadOutputToEndAsync(CancellationToken.None);
            Assert.That(stdout + stderr, Is.EqualTo(expectedOutput + Environment.NewLine));

            var stopResult = await this._orchestrator.KillContainerWithIdAsync(this._api.ContainerId);
            Assert.That(stopResult.Match(_ => true, _ => false), Is.True, "The orchestrator should stop the running container.");
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }
}
