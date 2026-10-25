using System.Net.WebSockets;

using Microsoft.AspNetCore.Http;

using NSubstitute;
using NSubstitute.ExceptionExtensions;

using Rena.Server.GameSockets;
using Microsoft.AspNetCore.Routing;
using System.Text;

namespace Rena.Tests.Unit;

[TestFixture]
public class GameSocketHandlerTests
{

    private HttpContext _mockHttpContext;
    private WebSocketManager _mockWebSocketManager;
    private WebSocket _mockWebSocket;

    [SetUp]
    public void BeforeEach()
    {
        _mockHttpContext = Substitute.For<HttpContext>();
        _mockWebSocketManager = Substitute.For<WebSocketManager>();
        _mockWebSocket = Substitute.For<WebSocket>();

        _mockWebSocketManager.IsWebSocketRequest.Returns(true);
        _mockWebSocketManager.AcceptWebSocketAsync().Returns(Task.FromResult(_mockWebSocket));
        _mockHttpContext.WebSockets.Returns(_mockWebSocketManager);

        var routeValueDictionary = new RouteValueDictionary
        {
            ["playerId"] = "player-999"
        };

        var mockRequest = Substitute.For<HttpRequest>();
        mockRequest.RouteValues.Returns(routeValueDictionary);
        _mockHttpContext.Request.Returns(mockRequest);
    }

    [TearDown]
    public void AfterEach()
    {
        _mockWebSocket.Dispose();
    }

    [Test]
    public async Task OnConnectedAsync_ValidWebSocketRequest_SpawnsConnectionAndExecutes()
    {

        _mockWebSocket.State.Returns(WebSocketState.Open);

        int callcount = 0;

        var testMessage = "Hello Game Server";
        var testMessageBytes = Encoding.UTF8.GetBytes(testMessage);

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

        await GameSocketHandler<MockGame, MockState, MockAction>.GameConnect(_mockHttpContext);
        
        string serverResponse = Encoding.UTF8.GetString(capturedResponseBytes);

        await _mockWebSocketManager.Received(1).AcceptWebSocketAsync();
        await _mockWebSocket.Received(1).CloseOutputAsync(
            Arg.Is(WebSocketCloseStatus.NormalClosure),
            Arg.Is("Closing Normally"),
            Arg.Is(CancellationToken.None)
        );
        
        Assert.That(serverResponse, Is.EqualTo($"Echo: {testMessage}\n"));

    }

    [Test]
    public async Task OnConnectedAsync_NotWebSocketRequest_RejectsImmediately()
    {
        _mockWebSocketManager.IsWebSocketRequest.Returns(false);

        await GameSocketHandler<MockGame, MockState, MockAction>.GameConnect(_mockHttpContext);

        await _mockWebSocketManager.DidNotReceive().AcceptWebSocketAsync();
        Assert.That(_mockHttpContext.Response.StatusCode, Is.EqualTo(400));
    }

    [Test]
    public async Task OnConnectedAsync_NoPlayerId_RejectsImmediately()
    {
        _mockHttpContext.Request.RouteValues.Returns([]);

        await GameSocketHandler<MockGame, MockState, MockAction>.GameConnect(_mockHttpContext);

        await _mockWebSocketManager.DidNotReceive().AcceptWebSocketAsync();
        Assert.That(_mockHttpContext.Response.StatusCode, Is.EqualTo(400));
    }

    [Test]
    public async Task OnConnectedAsync_UnexpectedError_AbortsConnection()
    {

        _mockWebSocket.ReceiveAsync(
            Arg.Any<ArraySegment<byte>>(), Arg.Any<CancellationToken>()
        ).Throws(new Exception("Something really weird happened"));
        _mockWebSocket.State.Returns(WebSocketState.Open);

        _mockWebSocketManager.AcceptWebSocketAsync().Returns(Task.FromResult(_mockWebSocket));

        await GameSocketHandler<MockGame, MockState, MockAction>.GameConnect(_mockHttpContext);

        await _mockWebSocket.Received(1).CloseAsync(
            Arg.Is(WebSocketCloseStatus.InternalServerError),
            Arg.Is("Something unnexpected happened"),
            Arg.Is(CancellationToken.None)
        );

    }
}
