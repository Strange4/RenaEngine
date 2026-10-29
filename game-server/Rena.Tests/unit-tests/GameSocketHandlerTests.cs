using System.Net.WebSockets;
using System.Threading.Channels;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Rena.Server.GameSockets;

namespace Rena.Tests.Unit;

[TestFixture]
public class GameSocketHandlerTests
{
    private HttpContext _mockHttpContext;
    private WebSocketManager _mockWebSocketManager;
    private WebSocket _mockWebSocket;
    private GameSocketHandler<MockGame, MockState, MockAction> _gameSocketHandler;
    private ChannelReader<Result<bool>> _mockChannel;

    [SetUp]
    public void BeforeEach()
    {
        _mockHttpContext = Substitute.For<HttpContext>();
        _mockWebSocketManager = Substitute.For<WebSocketManager>();
        _mockWebSocket = Substitute.For<WebSocket>();
        ILogger<GameSocketHandler<MockGame, MockState, MockAction>> logger = Substitute.For<
            ILogger<GameSocketHandler<MockGame, MockState, MockAction>>
        >();
        _mockChannel = Substitute.For<ChannelReader<Result<bool>>>();
        IGameRoomManager mockManager = Substitute.For<IGameRoomManager>();
        mockManager.Register(Arg.Any<string>(), Arg.Is(_mockWebSocket)).Returns(_mockChannel);
        _gameSocketHandler = new(mockManager, logger);

        _mockWebSocketManager.IsWebSocketRequest.Returns(true);
        _mockWebSocketManager.AcceptWebSocketAsync().Returns(Task.FromResult(_mockWebSocket));
        _mockHttpContext.WebSockets.Returns(_mockWebSocketManager);
    }

    [TearDown]
    public void AfterEach()
    {
        _mockWebSocket.Dispose();
    }

    [Test]
    public async Task OnConnectedAsync_ValidWebSocketRequest_SpawnsConnection()
    {
        _mockWebSocket.State.Returns(WebSocketState.Open);
        _mockChannel.ReadAsync().Returns(new Result<bool>(true));

        var playerId = "player-executes";

        await _gameSocketHandler.GameConnect(_mockHttpContext, playerId);

        await _mockWebSocketManager.Received(1).AcceptWebSocketAsync();
        await _mockWebSocket
            .Received(1)
            .CloseOutputAsync(Arg.Is(WebSocketCloseStatus.NormalClosure), Arg.Is("Closing Normally"), Arg.Is(CancellationToken.None));
        _mockWebSocket.Received(1).Dispose();
    }

    [Test]
    public async Task OnConnectedAsync_NotWebSocketRequest_RejectsImmediately()
    {
        _mockWebSocketManager.IsWebSocketRequest.Returns(false);

        await _gameSocketHandler.GameConnect(_mockHttpContext, "player-reject");

        await _mockWebSocketManager.DidNotReceive().AcceptWebSocketAsync();
        Assert.That(_mockHttpContext.Response.StatusCode, Is.EqualTo(400));
    }

    [Test]
    public async Task OnConnectedAsync_NoPlayerId_RejectsImmediately()
    {
        _mockHttpContext.Request.RouteValues.Returns([]);

        await _gameSocketHandler.GameConnect(_mockHttpContext, "");

        await _mockWebSocketManager.DidNotReceive().AcceptWebSocketAsync();
        Assert.That(_mockHttpContext.Response.StatusCode, Is.EqualTo(400));
    }

    [Test]
    public async Task OnConnectedAsync_UnexpectedError_AbortsConnection()
    {
        _mockChannel.ReadAsync().Throws(new Exception("Something really weird happened"));
        _mockWebSocket.State.Returns(WebSocketState.Open);

        _mockWebSocketManager.AcceptWebSocketAsync().Returns(Task.FromResult(_mockWebSocket));

        await _gameSocketHandler.GameConnect(_mockHttpContext, "player-error");

        await _mockWebSocket
            .Received(1)
            .CloseOutputAsync(
                Arg.Is(WebSocketCloseStatus.InternalServerError),
                Arg.Is("Something unnexpected happened"),
                Arg.Is(CancellationToken.None)
            );
        _mockWebSocket.Received(1).Dispose();
    }
}
