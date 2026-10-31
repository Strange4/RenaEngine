using System.Buffers.Binary;
using System.Formats.Tar;
using System.Text;
using System.Text.Json;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Rena.Tests.Integration;

internal sealed class DockerApiStub : IAsyncDisposable
{
    private readonly WebApplication _application;
    private bool _containerCreated;

    public Uri Endpoint { get; private set; } = null!;
    public List<DockerApiRequest> Requests { get; } = [];
    public string ContainerId { get; } = $"container-{Guid.NewGuid():N}";
    public string ContainerName { get; private set; } = string.Empty;
    public bool ContainerRunning { get; private set; }
    public string ContainerOutput { get; private set; } = string.Empty;
    public IReadOnlyDictionary<string, string> BuildContext { get; private set; } = new Dictionary<string, string>();

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

    private string RunPlayerScript()
    {
        if (this.BuildContext.TryGetValue("run.sh", out string? script) &&
            script.Split('\n').Any(line => line.Trim() == "cat /payload.txt") &&
            this.BuildContext.TryGetValue("payload.txt", out string? payload))
        {
            return payload;
        }

        string? echoLine = script?.Split('\n')
            .Select(line => line.Trim())
            .FirstOrDefault(line => line.StartsWith("echo \"$", StringComparison.Ordinal) && line.EndsWith('"'));
        if (echoLine is not null &&
            this.BuildContext.TryGetValue("Dockerfile", out string? dockerfile))
        {
            string variableName = echoLine[7..^1];
            string? environmentValue = dockerfile.Split('\n')
                .Select(line => line.Trim())
                .Where(line => line.StartsWith("ENV ", StringComparison.Ordinal))
                .Select(line => line[4..].Split('=', 2))
                .Where(parts => parts.Length == 2 && parts[0] == variableName)
                .Select(parts => parts[1])
                .FirstOrDefault();
            if (environmentValue is not null)
            {
                return environmentValue + Environment.NewLine;
            }
        }

        return string.Empty;
    }

    private async Task HandleAsync(HttpContext context)
    {
        using MemoryStream requestBody = new();
        await context.Request.Body.CopyToAsync(requestBody, context.RequestAborted);
        string path = context.Request.Path.Value!;
        string method = context.Request.Method;
        var request = new DockerApiRequest(
            method,
            path,
            context.Request.Query.ToDictionary(pair => pair.Key, pair => pair.Value.ToString()),
            requestBody.ToArray());
        this.Requests.Add(request);

        switch (GetRoute(method, path, this.ContainerId))
        {
            case DockerApiRoute.Ping:
                await WriteResponseAsync(context, StatusCodes.Status200OK, "OK", "text/plain");
                break;
            case DockerApiRoute.Build:
                await this.HandleBuildAsync(context, request);
                break;
            case DockerApiRoute.CreateContainer:
                await this.HandleCreateContainerAsync(context);
                break;
            case DockerApiRoute.ListContainers:
                await this.HandleListContainersAsync(context);
                break;
            case DockerApiRoute.StartContainer:
                await this.HandleStartContainerAsync(context);
                break;
            case DockerApiRoute.ContainerLogs:
                await this.HandleContainerLogsAsync(context);
                break;
            case DockerApiRoute.StopContainer:
                this.ContainerRunning = false;
                await WriteResponseAsync(context, StatusCodes.Status204NoContent, string.Empty);
                break;
            case DockerApiRoute.DeleteContainer:
                this._containerCreated = false;
                await WriteResponseAsync(context, StatusCodes.Status204NoContent, string.Empty);
                break;
            case DockerApiRoute.DeleteImage:
                await WriteResponseAsync(context, StatusCodes.Status200OK, "[]");
                break;
            default:
                await WriteResponseAsync(
                    context,
                    StatusCodes.Status404NotFound,
                    """{"message":"Unexpected Docker API request"}""");
                break;
        }
    }

    private static DockerApiRoute GetRoute(string method, string path, string containerId)
    {
        if (IsRoute(method, path, null, "/_ping")) return DockerApiRoute.Ping;
        if (IsRoute(method, path, "POST", "/build")) return DockerApiRoute.Build;
        if (IsRoute(method, path, "POST", "/containers/create")) return DockerApiRoute.CreateContainer;
        if (IsRoute(method, path, "GET", "/containers/json")) return DockerApiRoute.ListContainers;
        if (IsRoute(method, path, "POST", $"/containers/{containerId}/start")) return DockerApiRoute.StartContainer;
        if (IsRoute(method, path, "GET", $"/containers/{containerId}/logs")) return DockerApiRoute.ContainerLogs;
        if (IsRoute(method, path, "POST", $"/containers/{containerId}/stop")) return DockerApiRoute.StopContainer;
        if (IsRoute(method, path, "DELETE", $"/containers/{containerId}")) return DockerApiRoute.DeleteContainer;
        if (IsRoute(method, path, "DELETE", "/images/", contains: true)) return DockerApiRoute.DeleteImage;
        return DockerApiRoute.NotFound;
    }

    private static bool IsRoute(string method, string path, string? expectedMethod, string suffix, bool contains = false)
    {
        return (expectedMethod is null || method == expectedMethod) &&
            (contains
                ? path.Contains(suffix, StringComparison.Ordinal)
                : path.EndsWith(suffix, StringComparison.Ordinal));
    }

    private async Task HandleBuildAsync(HttpContext context, DockerApiRequest request)
    {
        this.BuildContext = ReadBuildContext(request.Body);
        await WriteResponseAsync(context, StatusCodes.Status200OK, "{\"stream\":\"build complete\\n\"}\n");
    }

    private async Task HandleCreateContainerAsync(HttpContext context)
    {
        this.ContainerName = context.Request.Query["name"].ToString();
        this._containerCreated = true;
        await WriteResponseAsync(context, StatusCodes.Status201Created, $$"""{"Id":"{{this.ContainerId}}","Warnings":[]}""");
    }

    private async Task HandleListContainersAsync(HttpContext context)
    {
        bool includeStopped = context.Request.Query["all"] == "1";
        bool shouldList = this._containerCreated && (this.ContainerRunning || includeStopped);
        string state = this.ContainerRunning ? "running" : "exited";
        string content = shouldList
            ? JsonSerializer.Serialize(new[]
            {
                new
                {
                    Id = this.ContainerId,
                    Names = new[] { $"/{this.ContainerName}" },
                    State = state
                }
            })
            : "[]";
        await WriteResponseAsync(context, StatusCodes.Status200OK, content);
    }

    private async Task HandleStartContainerAsync(HttpContext context)
    {
        this.ContainerRunning = true;
        this.ContainerOutput = this.RunPlayerScript();
        await WriteResponseAsync(context, StatusCodes.Status204NoContent, string.Empty);
    }

    private async Task HandleContainerLogsAsync(HttpContext context)
    {
        if (!this.ContainerRunning)
        {
            await WriteResponseAsync(context, StatusCodes.Status409Conflict, """{"message":"Container is not running"}""");
            return;
        }

        await WriteLogResponseAsync(context, this.ContainerOutput);
    }

    private enum DockerApiRoute
    {
        NotFound,
        Ping,
        Build,
        CreateContainer,
        ListContainers,
        StartContainer,
        ContainerLogs,
        StopContainer,
        DeleteContainer,
        DeleteImage
    }

    private static Dictionary<string, string> ReadBuildContext(byte[] body)
    {
        Dictionary<string, string> entries = new(StringComparer.Ordinal);
        using MemoryStream archiveStream = new(body);
        using TarReader reader = new(archiveStream);
        TarEntry? entry;
        while ((entry = reader.GetNextEntry()) is not null)
        {
            if (entry.DataStream is null)
            {
                continue;
            }

            using StreamReader contentReader = new(entry.DataStream, Encoding.UTF8, leaveOpen: true);
            entries[entry.Name] = contentReader.ReadToEnd();
        }

        return entries;
    }

    private static async Task WriteLogResponseAsync(HttpContext context, string output)
    {
        byte[] content = Encoding.UTF8.GetBytes(output);
        byte[] frame = new byte[8 + content.Length];
        frame[0] = 1;
        BinaryPrimitives.WriteInt32BigEndian(frame.AsSpan(4, 4), content.Length);
        content.CopyTo(frame.AsSpan(8));

        context.Response.StatusCode = StatusCodes.Status200OK;
        context.Response.ContentType = "application/vnd.docker.raw-stream";
        context.Response.ContentLength = frame.Length;
        await context.Response.Body.WriteAsync(frame, context.RequestAborted);
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
        if (statusCode != StatusCodes.Status204NoContent)
        {
            context.Response.ContentLength = contentBytes.Length;
            await context.Response.Body.WriteAsync(contentBytes, context.RequestAborted);
        }
    }
}

internal sealed record DockerApiRequest(
    string Method,
    string Path,
    IReadOnlyDictionary<string, string> Query,
    byte[] Body)
{
    public string? ImageName
    {
        get
        {
            using JsonDocument document = JsonDocument.Parse(this.Body);
            return document.RootElement.GetProperty("Image").GetString();
        }
    }
}
