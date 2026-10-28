using System.Formats.Tar;
using System.Text;

using Docker.DotNet;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

using Microsoft.Extensions.Logging.Abstractions;

using Rena.Server.DockerManager;

namespace Rena.Tests.Integration;

[TestFixture]
[Category("Integration")]
public sealed class DockerServicesIntegrationTests
{
    private DockerApiStub _api = null!;
    private IDockerClient _dockerClient = null!;

    [OneTimeSetUp]
    public async Task SetUp()
    {
        this._api = new DockerApiStub();
        await this._api.StartAsync();
        this._dockerClient = new DockerClientConfiguration(this._api.Endpoint).CreateClient();
    }

    [OneTimeTearDown]
    public async Task TearDown()
    {
        this._dockerClient.Dispose();
        await this._api.DisposeAsync();
    }

    [Test]
    public async Task ImageService_UsesDockerApiToFindAndDeleteAnImage()
    {
        DockerImageService service = new(this._dockerClient, NullLogger.Instance);

        var image = await service.FindImageByIdAsync("image-123");
        bool deleted = await service.DeleteImageAsync("sha256:image-123");

        Assert.That(image.IsSome, Is.True);
        image.IfSome(value => Assert.That(value.ID, Is.EqualTo("sha256:image-123")));
        Assert.That(deleted, Is.True);
        Assert.That(this._api.Requests, Has.Some.Matches<DockerApiRequest>(request =>
            request.Method == "GET" && request.Path.EndsWith("/images/json", StringComparison.Ordinal)));
        Assert.That(this._api.Requests, Has.Some.Matches<DockerApiRequest>(request =>
            request.Method == "DELETE" &&
            request.Path.EndsWith("/images/sha256:image-123", StringComparison.Ordinal) &&
            request.Query["force"] == "1"));
    }

    [Test]
    public async Task ContainerService_CreatesAndManagesAContainerThroughDockerApi()
    {
        DockerContainerService service = new(this._dockerClient, NullLogger.Instance);

        var created = await service.CreateContainerAsync("test-image:latest", "test-container");
        var found = await service.GetContainerByIdAsync("container-123", isRunning: false);
        bool started = await service.StartContainerAsync("container-123");
        bool stopped = await service.StopContainerAsync("container-123");
        bool deleted = await service.DeleteContainerAsync("container-123");

        Assert.That(created.IsSome, Is.True);
        created.IfSome(value => Assert.That(value.ID, Is.EqualTo("container-created")));
        Assert.That(found.IsSome, Is.True);
        Assert.That(started, Is.True);
        Assert.That(stopped, Is.True);
        Assert.That(deleted, Is.True);
        Assert.That(this._api.Requests, Has.Some.Matches<DockerApiRequest>(request =>
            request.Method == "POST" && request.Path.EndsWith("/containers/create", StringComparison.Ordinal)));
        Assert.That(this._api.Requests, Has.Some.Matches<DockerApiRequest>(request =>
            request.Method == "POST" && request.Path.EndsWith("/containers/container-123/start", StringComparison.Ordinal)));
        Assert.That(this._api.Requests, Has.Some.Matches<DockerApiRequest>(request =>
            request.Method == "POST" && request.Path.EndsWith("/containers/container-123/stop", StringComparison.Ordinal)));
        Assert.That(this._api.Requests, Has.Some.Matches<DockerApiRequest>(request =>
            request.Method == "DELETE" && request.Path.EndsWith("/containers/container-123", StringComparison.Ordinal)));
    }

    [Test]
    public async Task ImageService_BuildsAnImageThroughDockerApi()
    {
        string contextPath = Path.Combine(Path.GetTempPath(), $"docker-context-{Guid.NewGuid():N}");
        Directory.CreateDirectory(contextPath);
        string dockerfilePath = Path.Combine(contextPath, "Dockerfile");
        await File.WriteAllTextAsync(dockerfilePath, "FROM scratch");
        string contextFilePath = Path.Combine(contextPath, "app.txt");
        await File.WriteAllTextAsync(contextFilePath, "context contents");

        try
        {
            DockerImageService service = new(this._dockerClient, NullLogger.Instance);
            bool built = await service.CreateImageAsync(dockerfilePath, "test-image:latest", contextPath);

            Assert.That(built, Is.True);
            Assert.That(this._api.Requests, Has.Some.Matches<DockerApiRequest>(request =>
                request.Method == "POST" &&
                request.Path.EndsWith("/build", StringComparison.Ordinal) &&
                request.Query["dockerfile"] == "Dockerfile" &&
                request.Query["t"] == "test-image:latest" &&
                HasDockerBuildContext(request.Body)));
        }
        finally
        {
            Directory.Delete(contextPath, recursive: true);
        }
    }

    private static bool HasDockerBuildContext(byte[] body)
    {
        using MemoryStream archiveStream = new(body);
        using TarReader reader = new(archiveStream);
        bool hasDockerfile = false;
        bool hasContextFile = false;

        TarEntry? entry;
        while ((entry = reader.GetNextEntry()) is not null)
        {
            hasDockerfile |= entry.Name == "Dockerfile";
            if (entry.Name == "app.txt")
            {
                using StreamReader contentReader = new(entry.DataStream!);
                hasContextFile = contentReader.ReadToEnd() == "context contents";
            }
        }

        return hasDockerfile && hasContextFile;
    }

    private sealed class DockerApiStub : IAsyncDisposable
    {
        private readonly WebApplication _application;

        public Uri Endpoint { get; private set; } = null!;
        public List<DockerApiRequest> Requests { get; } = [];

        public DockerApiStub()
        {
            WebApplicationBuilder builder = WebApplication.CreateBuilder();
            builder.WebHost.UseUrls("http://127.0.0.1:0");
            this._application = builder.Build();
            this._application.Run(this.HandleAsync);
        }

        public async Task StartAsync()
        {
            await this._application.StartAsync();
            string address = this._application.Services
                .GetRequiredService<IServer>()
                .Features
                .Get<IServerAddressesFeature>()!
                .Addresses
                .Single();
            this.Endpoint = new Uri(address);
        }

        public ValueTask DisposeAsync() => this._application.DisposeAsync();

        private async Task HandleAsync(HttpContext context)
        {
            using MemoryStream requestBody = new();
            await context.Request.Body.CopyToAsync(requestBody);
            string path = context.Request.Path.Value!;
            string method = context.Request.Method;
            this.Requests.Add(new DockerApiRequest(
                method,
                path,
                context.Request.Query.ToDictionary(pair => pair.Key, pair => pair.Value.ToString()),
                requestBody.ToArray()));

            if (path.EndsWith("/_ping", StringComparison.Ordinal))
            {
                await WriteResponseAsync(context, StatusCodes.Status200OK, "OK", "text/plain");
            }
            else if (method == "GET" && path.EndsWith("/images/json", StringComparison.Ordinal))
            {
                await WriteResponseAsync(
                    context,
                    StatusCodes.Status200OK,
                    """[{"Id":"sha256:image-123","RepoTags":["test-image:latest"]}]""");
            }
            else if (method == "GET" && path.EndsWith("/containers/json", StringComparison.Ordinal))
            {
                await WriteResponseAsync(
                    context,
                    StatusCodes.Status200OK,
                    """[{"Id":"container-123","State":"running"}]""");
            }
            else if (method == "POST" && path.EndsWith("/containers/create", StringComparison.Ordinal))
            {
                await WriteResponseAsync(context, StatusCodes.Status201Created, """{"Id":"container-created","Warnings":[]}""");
            }
            else if (method == "POST" && path.EndsWith("/build", StringComparison.Ordinal))
            {
                await WriteResponseAsync(context, StatusCodes.Status200OK, "{\"stream\":\"build complete\\n\"}\n");
            }
            else if (method == "DELETE" && path.Contains("/images/", StringComparison.Ordinal))
            {
                await WriteResponseAsync(context, StatusCodes.Status200OK, "[]");
            }
            else if ((method == "POST" &&
                (path.EndsWith("/start", StringComparison.Ordinal) || path.EndsWith("/stop", StringComparison.Ordinal))) ||
                (method == "DELETE" && path.Contains("/containers/", StringComparison.Ordinal)))
            {
                await WriteResponseAsync(context, StatusCodes.Status204NoContent, string.Empty);
            }
            else
            {
                await WriteResponseAsync(
                    context,
                    StatusCodes.Status404NotFound,
                    """{"message":"Unexpected Docker API request"}""");
            }
        }

        private static async Task WriteResponseAsync(
            HttpContext context,
            int statusCode,
            string content,
            string contentType = "application/json")
        {
            byte[] contentBytes = Encoding.UTF8.GetBytes(content);
            context.Response.StatusCode = statusCode;
            context.Response.ContentType = contentType;
            context.Response.ContentLength = contentBytes.Length;
            await context.Response.Body.WriteAsync(contentBytes);
        }
    }

    private sealed record DockerApiRequest(string Method, string Path, IReadOnlyDictionary<string, string> Query, byte[] Body);
}
