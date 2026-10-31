using System.Net.WebSockets;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Rena.GameEngine;
using Rena.Utility;
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
    private ChannelReader<Result<bool>> _mockChannel;

    private IGameRoomManager _mockManager;

    [SetUp]
    public async Task BeforeEach()
    {
        _mockWebSocket = Substitute.For<WebSocket>();
        _mockLogger = Substitute.For<ILogger>();
        _mockManager = Substitute.For<IGameRoomManager>();
        _mockChannel = Substitute.For<ChannelReader<Result<bool>>>();
        _mockManager.Register(Arg.Any<string>(), Arg.Is(_mockWebSocket)).Returns(_mockChannel);
    }

    [TearDown]
    public async Task AfterEach()
    {
        _mockWebSocket.Dispose();
    }

    [Test]
    public async Task HandleConnection_RegistersConnection_ExitsGracefully()
    {
        var playerId = "player-123";

        _mockWebSocket.State.Returns(WebSocketState.Open);

        var socketConnection = new GameSocketConnection<MockGame, MockState, MockAction>(_mockWebSocket, playerId, _mockManager, _mockLogger);

        Assert.That(socketConnection.PlayerId, Is.EqualTo(playerId));

        _mockChannel.ReadAsync().Returns(new Result<bool>(true));

        await socketConnection.HandleConnection();

        await _mockChannel.Received(1).ReadAsync();

        await _mockManager.Received(1).Register(Arg.Is(playerId), Arg.Is(_mockWebSocket));
        await _mockManager.Received(1).UnRegister(Arg.Is(playerId));

        await _mockWebSocket
            .Received(1)
            .CloseOutputAsync(Arg.Is(WebSocketCloseStatus.NormalClosure), Arg.Is("Closing Normally"), Arg.Is(CancellationToken.None));
    }

    [Test]
    public async Task HandleConnection_DuplicateRegister_ExitsGracefully()
    {
        var playerId = "player-123";

        _mockWebSocket.State.Returns(WebSocketState.Open);

        var socketConnection = new GameSocketConnection<MockGame, MockState, MockAction>(_mockWebSocket, playerId, _mockManager, _mockLogger);

        Assert.That(socketConnection.PlayerId, Is.EqualTo(playerId));

        var exception = new ArgumentException("Test message");
        _mockChannel.ReadAsync().Returns(new Result<bool>(exception));

        await socketConnection.HandleConnection();

        await _mockChannel.Received(1).ReadAsync();

        await _mockManager.Received(1).Register(Arg.Is(playerId), Arg.Is(_mockWebSocket));
        await _mockManager.Received(1).UnRegister(Arg.Is(playerId));

        await _mockWebSocket
            .Received(1)
            .CloseOutputAsync(Arg.Is(WebSocketCloseStatus.PolicyViolation), Arg.Is(exception.Message), Arg.Is(CancellationToken.None));
    }

    [Test]
    public async Task HandleConnection_UnnexpectedError_ExitsGracefully()
    {
        var playerId = "player-123";

        _mockWebSocket.State.Returns(WebSocketState.Open);

        var socketConnection = new GameSocketConnection<MockGame, MockState, MockAction>(_mockWebSocket, playerId, _mockManager, _mockLogger);

        Assert.That(socketConnection.PlayerId, Is.EqualTo(playerId));

        var exception = new Exception("I'm Unnexpected");
        _mockChannel.ReadAsync().Returns(new Result<bool>(exception));

        await socketConnection.HandleConnection();

        await _mockChannel.Received(1).ReadAsync();

        await _mockManager.Received(1).Register(Arg.Is(playerId), Arg.Is(_mockWebSocket));
        await _mockManager.Received(1).UnRegister(Arg.Is(playerId));

        await _mockWebSocket
            .Received(1)
            .CloseOutputAsync(
                Arg.Is(WebSocketCloseStatus.InternalServerError),
                Arg.Is("Something unnexpected happened"),
                Arg.Is(CancellationToken.None)
            );
    }
}
