using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Rena.Server;
using Rena.Server.Rendering;

namespace Rena.Tests.Integration;

[TestFixture]
public class RenderStreamTests
{
    private WebApplication _app;
    private HttpClient _client;

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
        builder.SetRenaServices<TestGame, GameState, GameAction>();

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
    public async Task RenderStreamEndpoint_StreamsSSEEvents()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));

        using HttpRequestMessage request = new(HttpMethod.Get, "/render/stream");
        using HttpResponseMessage response = await _client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(response.Content.Headers.ContentType?.MediaType, Is.EqualTo("text/event-stream"));

        var broadcaster = _app.Services.GetRequiredService<RenderableBroadcaster>();
        broadcaster.BroadcastChange([
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
        Assert.That(dataLine, Contains.Substring("sse-test"));

        cts.Cancel();
    }
}
