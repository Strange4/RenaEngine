using System.IO.Pipelines;
using System.Net.WebSockets;

using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Connections;

using NSubstitute;
using NSubstitute.ExceptionExtensions;

using Rena.Server.GameSockets;

namespace Rena.Tests.Unit;

[TestFixture]
public class GameSocketHandlerTests
{
    private Pipe _clientToServerPipe;
    private Pipe _serverToClientPipe;
    private ConnectionContext _mockConnectionContext;
    private GameSocketHandler<MockGame, MockState, MockAction> _handler;

    [SetUp]
    public void BeforeEach()
    {
        _clientToServerPipe = new Pipe();
        _serverToClientPipe = new Pipe();

        _mockConnectionContext = Substitute.For<ConnectionContext>();
        _mockConnectionContext.ConnectionId.Returns("test-connection-id");
        _mockConnectionContext.Transport.Returns(new TestDuplexPipe(_clientToServerPipe.Reader, _serverToClientPipe.Writer));

        _handler = new GameSocketHandler<MockGame, MockState, MockAction>();
    }

    [TearDown]
    public async Task AfterEach()
    {
        await _mockConnectionContext.DisposeAsync();
    }

    [Test]
    public async Task OnConnectedAsync_ValidWebSocketRequest_SpawnsConnectionAndExecutes()
    {
        var mockHttpContext = Substitute.For<HttpContext>();
        var mockWebSocketManager = Substitute.For<WebSocketManager>();
        var mockWebSocket = Substitute.For<WebSocket>();

        var queryCollection = new QueryCollection(new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>
        {
            { "playerId", "player-999" }
        });

        var mockRequest = Substitute.For<HttpRequest>();
        mockRequest.Query.Returns(queryCollection);
        mockHttpContext.Request.Returns(mockRequest);

        mockWebSocketManager.IsWebSocketRequest.Returns(true);
        mockWebSocketManager.AcceptWebSocketAsync().Returns(Task.FromResult(mockWebSocket));
        mockHttpContext.WebSockets.Returns(mockWebSocketManager);

        _mockConnectionContext.GetHttpContext().Returns(mockHttpContext);

        mockWebSocket.State.Returns(WebSocketState.Open);

        await _clientToServerPipe.Writer.CompleteAsync();

        await _handler.OnConnectedAsync(_mockConnectionContext);

        await mockWebSocketManager.Received(1).AcceptWebSocketAsync();
    }

    [Test]
    public async Task OnConnectedAsync_NotWebSocketRequest_RejectsImmediately()
    {
        var mockHttpContext = Substitute.For<HttpContext>();
        var mockWebSocketManager = Substitute.For<WebSocketManager>();
        mockWebSocketManager.IsWebSocketRequest.Returns(false);
        mockHttpContext.WebSockets.Returns(mockWebSocketManager);

        _mockConnectionContext.GetHttpContext().Returns(mockHttpContext);

        await _handler.OnConnectedAsync(_mockConnectionContext);

        await mockWebSocketManager.DidNotReceive().AcceptWebSocketAsync();
    }

    [Test]
    public async Task OnConnectedAsync_UnexpectedError_AbortsConnection()
    {
        var mockHttpContext = Substitute.For<HttpContext>();
        var mockWebSocketManager = Substitute.For<WebSocketManager>();
        mockWebSocketManager.IsWebSocketRequest.Returns(true);
        mockHttpContext.WebSockets.Returns(mockWebSocketManager);

        WebSocket mockSocket = Substitute.For<WebSocket>();

        mockSocket.State.Throws(new Exception("Something really weird happened"));

        mockWebSocketManager.AcceptWebSocketAsync().Returns(Task.FromResult(mockSocket));

        _mockConnectionContext.GetHttpContext().Returns(mockHttpContext);

        await _handler.OnConnectedAsync(_mockConnectionContext);

        _mockConnectionContext.Received(1).Abort();
    }
}
