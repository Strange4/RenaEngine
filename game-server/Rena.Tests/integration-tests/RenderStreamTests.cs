using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

using Moq;

using NSubstitute.ReturnsExtensions;

using Rena.Server;
using Rena.Server.GameSockets;
using Rena.Server.Rendering;
using Rena.Utility;

namespace Rena.Tests.Integration;

[TestFixture]
public class RenderStreamTests
{
    private WebApplication _app;
    private HttpClient _client;
    private RenderableBroadcaster _broadcaster;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });

        builder.WebHost.UseTestServer();
        builder.Configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                { "RenaOptions:TSProtoPath", "TESTING" },
                { "RenaOptions:AdminToken", "TEST-ADMIN-TOKEN" },
                { "RenaOptions:Features:test-feature", "false" },
            }
        );
        var mockGameRoomManager = new Mock<IGameRoomManager>();
        var mockMatchMaker = new Mock<IMatchMaker<TestGame, GameState, GameAction>>();
        var mockLogger = new Mock<ILogger>();
        var normalGameRoomManager = new GameRoomManager<TestGame, GameState, GameAction>(mockMatchMaker.Object, 1, mockLogger.Object);

        _broadcaster = new RenderableBroadcaster();
        mockGameRoomManager.Setup(s => s.GetBroadcasterForPlayer(It.IsAny<string>())).Returns<string>(normalGameRoomManager.GetBroadcasterForPlayer);

        mockGameRoomManager.Setup(s => s.GetBroadcasterForPlayer("pid123")).Returns(new Result<RenderableBroadcaster>(_broadcaster));

        builder.SetRenaServices<TestGame, GameState, GameAction>();
        builder.Services.Replace(ServiceDescriptor.Singleton(sp => mockGameRoomManager.Object));

        _app = builder.Build();

        _app.UseRenaEndpoints<TestGame, GameState, GameAction>();

        await _app.StartAsync();
        _client = _app.GetTestClient();
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        _client?.Dispose();
        if (_app is not null)
        {
            await _app.DisposeAsync();
        }
    }

    [Test]
    public async Task RenderStreamEndpoint_DeniesUnknownStream()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));

        using HttpRequestMessage request = new(HttpMethod.Get, "/render/stream/unknown");
        using HttpResponseMessage response = await _client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task RenderStreamEndpoint_StreamsSSEEvents()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));

        using HttpRequestMessage request = new(HttpMethod.Get, "/render/stream/pid123");
        using HttpResponseMessage response = await _client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(response.Content.Headers.ContentType?.MediaType, Is.EqualTo("text/event-stream"));

        this._broadcaster.SetCurrentRenderables([
            new GameRenderable
            {
                Id = "sse-test",
                Position = [1, 1],
                AssetPath = "/sprites/test.png",
                Size = [1, 1],
                Type = RenderableType.MAP,
                Layer = 0,
            },
        ]);

        // StreamReader has ReadLineAsync useful for SSE
        using StreamReader streamReader = new(await response.Content.ReadAsStreamAsync(cts.Token));
        string? eventLine = await streamReader.ReadLineAsync(cts.Token);
        string? dataLine = await streamReader.ReadLineAsync(cts.Token);

        Assert.That(eventLine, Is.EqualTo("event: change"));
        string expectedJson = """
                {
                    "index": 1,
                    "changes": [
                    {
                        "id": "sse-test",
                        "position": [1, 1],
                        "assetPath": "/sprites/test.png",
                        "size": [1, 1],
                        "type": "MAP",
                        "layer": 0
                    }
                    ]
                }
            """;
        string serializedJson = JsonSerializer.Serialize(JsonDocument.Parse(expectedJson));
        string expectedData = $"data: {serializedJson}";
        Assert.That(dataLine, Is.EqualTo(expectedData));

        cts.Cancel();
    }
}
