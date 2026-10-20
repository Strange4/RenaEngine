using System.Net.WebSockets;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;

using Rena.Server;
using System.Text;

namespace Rena.Tests.Integration;

[TestFixture]
public class GameSocketTests
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
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>{
            {"RenaOptions:TSProtoPath", "TESTING"},
        });
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
    public async Task GameConnectEndpoint_EchoSuccess()
    {
        var socketClient = _app.GetTestServer().CreateWebSocketClient();
        var wsUri = new Uri("ws://localhost/game/connect/player-123");

        var webSocket = await socketClient.ConnectAsync(wsUri, CancellationToken.None);
        Assert.That(webSocket.State, Is.EqualTo(WebSocketState.Open));

        var messageToSend = "Hello Integration Test";
        var sendBuffer = Encoding.UTF8.GetBytes(messageToSend);
        
        await webSocket.SendAsync(
            new ArraySegment<byte>(sendBuffer), 
            WebSocketMessageType.Text, 
            endOfMessage: true, 
            CancellationToken.None
        );

        var receiveBuffer = new byte[1024];
        var receiveResult = await webSocket.ReceiveAsync(new ArraySegment<byte>(receiveBuffer), CancellationToken.None);
        
        string serverResponse = Encoding.UTF8.GetString(receiveBuffer, 0, receiveResult.Count);

        Assert.That(serverResponse, Is.EqualTo($"Echo: {messageToSend}\n"));

        await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing test", CancellationToken.None);
    }

    
}


