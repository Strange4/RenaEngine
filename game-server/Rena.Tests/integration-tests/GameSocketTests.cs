using System.Net.WebSockets;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using ProtoBuf;
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
        builder.Configuration.AddInMemoryCollection(
            new Dictionary<string, string?> { { "RenaOptions:TSProtoPath", "TESTING" }, { "RenaOptions:RoomSize", "1" } }
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

    private static async Task<byte[]> ReceiveBytesFromSocket(WebSocket socket)
    {
        var receiveBuffer = new byte[1024];
        using var ms = new MemoryStream();
        WebSocketReceiveResult receiveResult;

        do
        {
            receiveResult = await socket.ReceiveAsync(new ArraySegment<byte>(receiveBuffer), CancellationToken.None);

            if (receiveResult.MessageType == WebSocketMessageType.Close)
                break;

            ms.Write(receiveBuffer, 0, receiveResult.Count);
        } while (!receiveResult.EndOfMessage);

        return ms.ToArray();
    }

    private static async Task<GameState> ReceiveStateFromSocket(WebSocket socket)
    {
        return Serializer.Deserialize<GameState>(await ReceiveBytesFromSocket(socket));
    }

    private static async Task<string> ReceiveStringFromSocket(WebSocket socket)
    {
        return Encoding.UTF8.GetString(await ReceiveBytesFromSocket(socket));
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
        var socketClient = _app.GetTestServer().CreateWebSocketClient();
        var wsUri1 = new Uri($"ws://localhost/game/connect/test/{playerId1}");

        var webSocket1 = await socketClient.ConnectAsync(wsUri1, CancellationToken.None);

        Assert.That(webSocket1.State, Is.EqualTo(WebSocketState.Open));

        GameState serverResponse1 = await ReceiveStateFromSocket(webSocket1);

        Assert.That(serverResponse1.X, Is.EqualTo(0));

        GameAction winAction = new() { Y = 7 };
        using var ms = new MemoryStream();
        Serializer.Serialize(ms, winAction);

        await webSocket1.SendAsync(ms.ToArray(), WebSocketMessageType.Binary, true, CancellationToken.None);

        WebSocketReceiveResult result1 = await WaitForClose(webSocket1);

        Assert.That(result1.MessageType, Is.EqualTo(WebSocketMessageType.Close));

        Assert.That(webSocket1.State, Is.EqualTo(WebSocketState.CloseReceived));
    }
}
