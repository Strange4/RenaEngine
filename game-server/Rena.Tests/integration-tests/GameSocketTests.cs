using System.Net.WebSockets;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Rena.Server;

namespace Rena.Tests.Integration;

[TestFixture]
public class GameSocketTests
{
    private WebApplication _app;
    private HttpClient _client;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });

        builder.WebHost.UseTestServer();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { { "RenaOptions:TSProtoPath", "TESTING" } });
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

    private static async Task<string> ReceiveStringFromSocket(WebSocket webSocket)
    {
        var receiveBuffer = new byte[1024];
        using var ms = new MemoryStream();
        WebSocketReceiveResult receiveResult;

        do
        {
            receiveResult = await webSocket.ReceiveAsync(new ArraySegment<byte>(receiveBuffer), CancellationToken.None);

            if (receiveResult.MessageType == WebSocketMessageType.Close)
                break;

            ms.Write(receiveBuffer, 0, receiveResult.Count);
        } while (!receiveResult.EndOfMessage);

        return Encoding.UTF8.GetString(ms.ToArray());
    }

    private static async Task<WebSocketReceiveResult> WaitForClose(WebSocket webSocket)
    {
        var receiveBuffer = new byte[1024];
        WebSocketReceiveResult receiveResult;
        do
        {
            receiveResult = await webSocket.ReceiveAsync(new ArraySegment<byte>(receiveBuffer), CancellationToken.None);
        } while (receiveResult.MessageType != WebSocketMessageType.Close);

        return receiveResult;
    }

    [Test]
    public async Task GameConnectEndpoint_SendJoinAndEnds()
    {
        var playerId1 = "player-123";
        var playerId2 = "player-1234";
        var socketClient = _app.GetTestServer().CreateWebSocketClient();
        var wsUri1 = new Uri($"ws://localhost/game/connect/{playerId1}");
        var wsUri2 = new Uri($"ws://localhost/game/connect/{playerId2}");

        var webSocket1 = await socketClient.ConnectAsync(wsUri1, CancellationToken.None);
        var webSocket2 = await socketClient.ConnectAsync(wsUri2, CancellationToken.None);

        Assert.That(webSocket1.State, Is.EqualTo(WebSocketState.Open));
        Assert.That(webSocket2.State, Is.EqualTo(WebSocketState.Open));

        string serverResponse1 = await ReceiveStringFromSocket(webSocket1);
        string serverResponse2 = await ReceiveStringFromSocket(webSocket2);

        Assert.That(serverResponse1, Is.EqualTo($"You, player {playerId1}, have connected to the game\n"));
        Assert.That(serverResponse2, Is.EqualTo($"You, player {playerId2}, have connected to the game\n"));

        WebSocketReceiveResult result1 = await WaitForClose(webSocket1);
        WebSocketReceiveResult result2 = await WaitForClose(webSocket2);

        Assert.That(result1.MessageType, Is.EqualTo(WebSocketMessageType.Close));
        Assert.That(result2.MessageType, Is.EqualTo(WebSocketMessageType.Close));

        Assert.That(webSocket1.State, Is.EqualTo(WebSocketState.CloseReceived));
        Assert.That(webSocket2.State, Is.EqualTo(WebSocketState.CloseReceived));
    }
}
