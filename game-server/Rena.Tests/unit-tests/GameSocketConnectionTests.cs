using Microsoft.AspNetCore.Connections;
using System.IO.Pipelines;
using System.Net.WebSockets;
using System.Text;
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
    Pipe _clientToServerPipe;
    Pipe _serverToClientPipe;
    WebSocket _mockWebSocket;
    DefaultConnectionContext _connectionContext;

    [SetUp]
    public async Task BeforeEach()
    {
        _clientToServerPipe = new Pipe();
        _serverToClientPipe = new Pipe();
        _mockWebSocket = Substitute.For<WebSocket>();
        _connectionContext = new DefaultConnectionContext
        {
            ConnectionId = "test-connection-id",
            Transport = new TestDuplexPipe(_clientToServerPipe.Reader, _serverToClientPipe.Writer)
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
            _connectionContext, 
            _mockWebSocket, 
            playerId
        );

        Assert.That(socketConnection.PlayerId, Is.EqualTo(playerId));

        var testMessage = "Hello Game Server";
        
        await _clientToServerPipe.Writer.WriteAsync(Encoding.UTF8.GetBytes(testMessage));
        await _clientToServerPipe.Writer.CompleteAsync();

        await socketConnection.HandleConnection();

        var readResult = await _serverToClientPipe.Reader.ReadAsync();
        var outputBuffer = readResult.Buffer;
        string serverResponse = Encoding.UTF8.GetString(outputBuffer);

        Assert.That(serverResponse, Is.EqualTo($"Echo: {testMessage}\n"));
    }

    public async Task HandleConnection_ClosesConnection_OnWebSocketClose()
    {
        var playerId = "player-who-is-done";
        
        _mockWebSocket.State.Returns(WebSocketState.CloseReceived);

        var socketConnection = new GameSocketConnection<MockGame, MockState, MockAction>(
            _connectionContext, 
            _mockWebSocket, 
            playerId
        );

        var testMessage = "Hello Game Server";
        
        await _clientToServerPipe.Writer.WriteAsync(Encoding.UTF8.GetBytes(testMessage));
        await _clientToServerPipe.Writer.CompleteAsync();

        await socketConnection.HandleConnection();

        var readResult = await _serverToClientPipe.Reader.ReadAsync();
        var outputBuffer = readResult.Buffer;
        string serverResponse = Encoding.UTF8.GetString(outputBuffer);

        Assert.That(serverResponse, Is.EqualTo(""));

    }
}


internal class TestDuplexPipe(PipeReader input, PipeWriter output) : IDuplexPipe
{
    public PipeReader Input { get; } = input;
    public PipeWriter Output { get; } = output;
}