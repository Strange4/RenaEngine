using System.Net.WebSockets;
using System.Text;

using Microsoft.AspNetCore.Connections;

using NSubstitute;

using Rena.GameEngine;
using Rena.Server.GameSockets;

namespace Rena.Tests.Unit;

public class MockGame : IGame<MockState, MockAction>
{
    public string GetName()
    {
        return "MockGame";
    }
}
public class MockState { }
public class MockAction { }

[TestFixture]
public class GameSocketConnectionTests
{
    WebSocket _mockWebSocket;
    DefaultConnectionContext _connectionContext;

    [SetUp]
    public async Task BeforeEach()
    {
        _mockWebSocket = Substitute.For<WebSocket>();
        _connectionContext = new DefaultConnectionContext
        {
            ConnectionId = "test-connection-id",
        };
    }

    [TearDown]
    public async Task AfterEach()
    {
        _mockWebSocket.Dispose();
        await _connectionContext.DisposeAsync();
    }

    [Test]
    public async Task HandleConnection_ReadsMessage_AndEchoesCorrectly()
    {
        var playerId = "player-123";

        _mockWebSocket.State.Returns(WebSocketState.Open);

        var socketConnection = new GameSocketConnection<MockGame, MockState, MockAction>(
            _mockWebSocket,
            playerId
        );

        Assert.That(socketConnection.PlayerId, Is.EqualTo(playerId));

        var testMessage = "Hello Game Server";
        var testMessageBytes = Encoding.UTF8.GetBytes(testMessage);


        // Setup the receive to transfer the test message into the input array
        _mockWebSocket
            .ReceiveAsync(Arg.Any<ArraySegment<byte>>(), Arg.Any<CancellationToken>())
            .Returns(async callInfo =>
            {
                // Make sure to disconnect after reading once
                _mockWebSocket.State.Returns(WebSocketState.CloseReceived);
                
                var bufferArg = callInfo.ArgAt<ArraySegment<byte>>(0);
                Array.Copy(testMessageBytes, 0, bufferArg.Array!, bufferArg.Offset, testMessageBytes.Length);

                return new WebSocketReceiveResult(
                    testMessageBytes.Length, 
                    WebSocketMessageType.Text, 
                    endOfMessage: true
                );
                
            });
        
        byte[]? capturedResponseBytes = Encoding.UTF8.GetBytes("Send Async is failing");

        // Setup the send to transfer the test message back to the test
        await _mockWebSocket.SendAsync(
            Arg.Do<ArraySegment<byte>>(bytes => capturedResponseBytes = [.. bytes]),
            Arg.Any<WebSocketMessageType>(),
            Arg.Any<bool>(),
            Arg.Any<CancellationToken>()
        );

        await socketConnection.HandleConnection();

        string serverResponse = Encoding.UTF8.GetString(capturedResponseBytes);

        Assert.That(serverResponse, Is.EqualTo($"Echo: {testMessage}\n"));
    }

    [Test]
    public async Task HandleConnection_ClosesConnection_OnWebSocketClose()
    {
        var playerId = "player-who-is-done";

        _mockWebSocket.State.Returns(WebSocketState.CloseReceived);

        var socketConnection = new GameSocketConnection<MockGame, MockState, MockAction>(
            _mockWebSocket,
            playerId
        );

        await socketConnection.HandleConnection();

        await _mockWebSocket.Received(1).CloseAsync(
        WebSocketCloseStatus.NormalClosure,
        "Closing Normally",
        Arg.Any<CancellationToken>()
        );

        await _mockWebSocket.Received(0).SendAsync(
            Arg.Any<ArraySegment<byte>>(),
            Arg.Any<WebSocketMessageType>(),
            Arg.Any<bool>(),
            Arg.Any<CancellationToken>()
        );

    }
}
