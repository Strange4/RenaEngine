using System.Net;
using System.Net.Http.Json;
using System.Runtime.Serialization;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;

using Rena.GameEngine;
using Rena.Server;

namespace Rena.Tests.Integration;

[TestFixture]
public class EndpointTests
{
    private WebApplication _app;
    private HttpClient _client;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        var builder = WebApplication.CreateBuilder(
            new WebApplicationOptions
            {
                EnvironmentName = "Testing",
                Args = []
            });

        builder.WebHost.UseTestServer();
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
    public async Task DefaultEndpointTest()
    {
        var response = await _client.GetAsync("/");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));

        var content = await response.Content.ReadAsStringAsync();
        Assert.That(content, Is.EqualTo("Hello World!"));
    }

    [Test]
    public async Task Name_ReturnsGameName()
    {
        using var response = await _client.GetAsync("/name");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        var name = await response.Content.ReadFromJsonAsync<string>();
        Assert.That(name, Is.EqualTo("Example game"));
    }
}


[DataContract]
public class GameState
{
    [DataMember(Order = 1)]
    public int X;
}

[DataContract]
public class GameAction
{
    [DataMember(Order = 1)]
    public int Y;
}

public class TestGame : IGame<GameState, GameAction>
{
    public string GetName()
    {
        return "Example game";
    }
}
