using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Http;
using System.IO.Pipelines;
using System.Net.WebSockets;
using NSubstitute;

using Rena.Server.GameSockets;
using Microsoft.AspNetCore.Http.Connections;
using NSubstitute.ExceptionExtensions;
using Microsoft.AspNetCore.Http.Connections.Features;

namespace Rena.Tests.Unit;

[TestFixture]
public class GameSocketHandlerTests
{
    private Pipe _clientToServerPipe;
    private Pipe _serverToClientPipe;
    private DefaultConnectionContext _connectionContext;
    private GameSocketHandler<MockGame, MockState, MockAction> _handler;

    [SetUp]
    public void BeforeEach()
    {
        _clientToServerPipe = new Pipe();
        _serverToClientPipe = new Pipe();
        
        _connectionContext = new DefaultConnectionContext
        {
            ConnectionId = "test-connection-id",
            Transport = new TestDuplexPipe(_clientToServerPipe.Reader, _serverToClientPipe.Writer),
        };

        _handler = new GameSocketHandler<MockGame, MockState, MockAction>();
    }

    [TearDown]
    public async Task AfterEach()
    {
        await _connectionContext.DisposeAsync();
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


        var mockHttpContextFeature = Substitute.For<IHttpContextFeature>();
        mockHttpContextFeature.HttpContext.Returns(mockHttpContext);
        _connectionContext.Features.Set(mockHttpContextFeature);

        
        mockWebSocket.State.Returns(WebSocketState.Open);
        
        await _clientToServerPipe.Writer.CompleteAsync();

        await _handler.OnConnectedAsync(_connectionContext);

        await mockWebSocketManager.Received(1).AcceptWebSocketAsync();
    }

    [Test]
    public async Task OnConnectedAsync_NotWebSocketRequest_RejectsImmediately()
    {
        var mockHttpContext = Substitute.For<HttpContext>();
        var mockWebSocketManager = Substitute.For<WebSocketManager>();
        mockWebSocketManager.IsWebSocketRequest.Returns(false); 
        mockHttpContext.WebSockets.Returns(mockWebSocketManager);

        var mockHttpContextFeature = Substitute.For<IHttpContextFeature>();
        mockHttpContextFeature.HttpContext.Returns(mockHttpContext);
        _connectionContext.Features.Set(mockHttpContextFeature);

        
        await _handler.OnConnectedAsync(_connectionContext);

        await mockWebSocketManager.DidNotReceive().AcceptWebSocketAsync();
    }

    [Test]
    public async Task OnConnectedAsync_UnexpectedError_AbortsConnection()
    {
        var mockConnection = Substitute.For<ConnectionContext>();
        mockConnection.ConnectionId.Returns("Mock Connection");

        var mockHttpContext = Substitute.For<HttpContext>();
        var mockWebSocketManager = Substitute.For<WebSocketManager>();
        mockWebSocketManager.IsWebSocketRequest.Returns(true); 
        mockHttpContext.WebSockets.Returns(mockWebSocketManager);

        WebSocket mockSocket = Substitute.For<WebSocket>();

        mockSocket.State.Throws(new Exception("Something really weird happened"));

        mockWebSocketManager.AcceptWebSocketAsync().Returns(Task.FromResult(mockSocket));

        mockConnection.GetHttpContext().Returns(mockHttpContext);
                
        await _handler.OnConnectedAsync(mockConnection);

        mockConnection.Received(1).Abort();
    }
}