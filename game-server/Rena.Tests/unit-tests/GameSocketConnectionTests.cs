using System.Net.WebSockets;
using System.Text;

using Microsoft.Extensions.Logging;

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
    private WebSocket _mockWebSocket;
    private ILogger _mockLogger;

    [SetUp]
    public async Task BeforeEach()
    {
        _mockWebSocket = Substitute.For<WebSocket>();
        _mockLogger = Substitute.For<ILogger>();
    }

    [TearDown]
    public async Task AfterEach()
    {
        _mockWebSocket.Dispose();
    }

    [Test]
    public async Task HandleConnection_ReadsMessage_AndEchoesCorrectly()
    {
        var playerId = "player-123";

        _mockWebSocket.State.Returns(WebSocketState.Open);

        var socketConnection = new GameSocketConnection<MockGame, MockState, MockAction>(
            _mockWebSocket,
            playerId,
            _mockLogger
        );

        Assert.That(socketConnection.PlayerId, Is.EqualTo(playerId));

        var testMessage = "Hello Game Server";
        var testMessageBytes = Encoding.UTF8.GetBytes(testMessage);

        int callcount = 0;

        // Setup the receive to transfer the test message into the input array
        _mockWebSocket
            .ReceiveAsync(Arg.Any<ArraySegment<byte>>(), Arg.Any<CancellationToken>())
            .Returns(async callInfo =>
            {
                callcount++;
                if (callcount == 1)
                {
                    var bufferArg = callInfo.ArgAt<ArraySegment<byte>>(0);
                    Array.Copy(testMessageBytes, 0, bufferArg.Array!, bufferArg.Offset, testMessageBytes.Length);

                    return new WebSocketReceiveResult(
                        testMessageBytes.Length,
                        WebSocketMessageType.Text,
                        endOfMessage: true
                    );
                }

                return new WebSocketReceiveResult(
                    0,
                    WebSocketMessageType.Close,
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

        _mockWebSocket
            .ReceiveAsync(Arg.Any<ArraySegment<byte>>(), Arg.Any<CancellationToken>())
            .Returns(_ => new WebSocketReceiveResult(
                    0,
                    WebSocketMessageType.Close,
                    endOfMessage: true
                ));

        var socketConnection = new GameSocketConnection<MockGame, MockState, MockAction>(
            _mockWebSocket,
            playerId,
            _mockLogger
        );

        await socketConnection.HandleConnection();

        await _mockWebSocket.Received(1).CloseOutputAsync(
        Arg.Is(WebSocketCloseStatus.NormalClosure),
        Arg.Is("Closing Normally"),
        Arg.Is(CancellationToken.None)
        );

        await _mockWebSocket.DidNotReceive().SendAsync(
            Arg.Any<ArraySegment<byte>>(),
            Arg.Any<WebSocketMessageType>(),
            Arg.Any<bool>(),
            Arg.Any<CancellationToken>()
        );

    }
}
