using System.Net.WebSockets;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Rena.Server.GameSockets;

namespace Rena.Tests.Unit;

[TestFixture]
public class GameRoomManagerTests
{
    private GameRoomManager<MockGame, MockState, MockAction> _manager;

    [SetUp]
    public void SetUp()
    {
        var logger = Substitute.For<ILogger>();

        _manager = new GameRoomManager<MockGame, MockState, MockAction>(roomSize: 2, logger: logger);
    }

    [Test]
    public async Task Register_FirstPlayer_ReturnsEmptyReader()
    {
        var socket = Substitute.For<WebSocket>();

        var reader = await _manager.Register("player-1", socket);

        Assert.That(reader.TryRead(out _), Is.False);
    }

    [Test]
    public async Task Register_DuplicateId_ReturnsErrorForDuplicate()
    {
        var socket = Substitute.For<WebSocket>();

        var originalReader = await _manager.Register("player-1", socket);

        var duplicateReader = await _manager.Register("player-1", socket);

        var duplicateResult = await duplicateReader.ReadAsync();

        Assert.That(originalReader.TryRead(out _), Is.False);
        Assert.That(duplicateResult.IsSuccess, Is.False);
        Assert.That(duplicateResult.Exception, Is.TypeOf<ArgumentException>());
        Assert.That(duplicateResult.Exception!.Message, Is.EqualTo("Player already connected. Please disconnect before trying again."));
    }

    [Test]
    public async Task Register_OnRoomFull_ReturnsSuccess()
    {
        var socket = Substitute.For<WebSocket>();

        var reader1 = await _manager.Register("player-1", socket);

        var reader2 = await _manager.Register("player-2", socket);

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

        var reader1 = await _manager.Register("player-1", socket);

        var reader2 = await _manager.Register("player-2", socket);

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
    public async Task UnRegister_AllowsReRegister()
    {
        var playerId = "player-1";
        var socket = Substitute.For<WebSocket>();

        var reader1 = await _manager.Register(playerId, socket);

        await _manager.UnRegister(playerId);

        var reader2 = await _manager.Register(playerId, socket);

        Assert.That(reader1.TryRead(out _), Is.False);
        Assert.That(reader2.TryRead(out _), Is.False);
    }
}
