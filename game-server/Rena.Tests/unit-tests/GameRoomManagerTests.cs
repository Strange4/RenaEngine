using System.Net.WebSockets;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Rena.Server.GameSockets;

namespace Rena.Tests.Unit;

[TestFixture]
public class GameRoomManagerTests
{
    private GameRoomManager<MockGame, GameState, GameAction> _manager;
    private IMatchMaker<MockGame, GameState, GameAction> _mockMatchmaker;

    private GameRoom<MockGame, GameState, GameAction> _mockRoom;

    [SetUp]
    public void SetUp()
    {
        var logger = Substitute.For<ILogger>();
        _mockMatchmaker = Substitute.For<IMatchMaker<MockGame, GameState, GameAction>>();

        _manager = new GameRoomManager<MockGame, GameState, GameAction>(_mockMatchmaker, 2, logger);

        _mockRoom = Substitute.For<GameRoom<MockGame, GameState, GameAction>>(2, logger, null);

        _mockMatchmaker.GetTestRoom(Arg.Any<string>(), Arg.Any<int>()).Returns(new Utility.Result<GameRoom<MockGame, GameState, GameAction>>(_mockRoom));
    }

    [Test]
    public async Task Register_FirstPlayer_ReturnsEmptyReader()
    {
        var socket = Substitute.For<WebSocket>();

        var result = await _manager.RegisterForTest("player-1", socket);

        Assert.That(result.IsSuccess, Is.True);
        Assert.That(result.Value!.TryRead(out _), Is.False);
    }

    [Test]
    public async Task Register_DuplicateId_ReturnsErrorForDuplicate()
    {
        var socket = Substitute.For<WebSocket>();

        var originalResult = await _manager.RegisterForTest("player-1", socket);

        var duplicateResult = await _manager.RegisterForTest("player-1", socket);

        Assert.That(originalResult.Value!.TryRead(out _), Is.False);
        Assert.That(duplicateResult.IsSuccess, Is.False);
        Assert.That(duplicateResult.Exception, Is.TypeOf<ArgumentException>());
        Assert.That(duplicateResult.Exception!.Message, Is.EqualTo("Player already connected. Please disconnect before trying again."));
    }

    [Test]
    public async Task Register_OnRoomFull_ReturnsSuccess()
    {
        var socket = Substitute.For<WebSocket>();

        MockGame.Mock.IsGameOver().Returns(true);

        var reader1 = (await _manager.RegisterForTest("player-1", socket)).Value!;

        var reader2 = (await _manager.RegisterForTest("player-2", socket)).Value!;

        var result1 = await reader1.ReadAsync();
        var result2 = await reader2.ReadAsync();

        Assert.That(result1.IsSuccess, Is.True);
        Assert.That(result1.Exception, Is.Null);
        Assert.That(result2.IsSuccess, Is.True);
        Assert.That(result2.Exception, Is.Null);
    }

    [Test]
    public async Task Register_OnGameError_ReturnsError()
    {
        var socket = Substitute.For<WebSocket>();

        var errorMessage = "Something bad happened";

        socket
            .SendAsync(Arg.Any<ArraySegment<byte>>(), Arg.Any<WebSocketMessageType>(), Arg.Any<bool>(), Arg.Any<CancellationToken>())
            .Throws(new ArgumentOutOfRangeException(errorMessage, new Exception("inner exception")));

        MockGame.Mock.IsGameOver().Throws(new ArgumentOutOfRangeException(errorMessage, new Exception("inner exception")));

        var reader1 = (await _manager.RegisterForTest("player-1", socket)).Value!;

        var reader2 = (await _manager.RegisterForTest("player-2", socket)).Value!;

        var result1 = await reader1.ReadAsync();
        var result2 = await reader2.ReadAsync();

        Assert.That(result1.IsSuccess, Is.False);
        Assert.That(result1.Exception, Is.TypeOf<ArgumentOutOfRangeException>());
        Assert.That(result1.Exception!.Message, Is.EqualTo(errorMessage));
        Assert.That(result2.IsSuccess, Is.False);
        Assert.That(result2.Exception, Is.TypeOf<ArgumentOutOfRangeException>());
        Assert.That(result2.Exception!.Message, Is.EqualTo(errorMessage));
    }

    [Test]
    public async Task UnRegister_AllowsReRegisterForTest()
    {
        var playerId = "player-1";
        var socket = Substitute.For<WebSocket>();

        var reader1 = (await _manager.RegisterForTest(playerId, socket)).Value!;

        await _manager.UnRegister(playerId);

        var reader2 = (await _manager.RegisterForTest(playerId, socket)).Value!;

        Assert.That(reader1.TryRead(out _), Is.False);
        Assert.That(reader2.TryRead(out _), Is.False);
    }
}
