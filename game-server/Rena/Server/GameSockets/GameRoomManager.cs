using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Threading.Channels;
using AsyncAwaitBestPractices;
using Microsoft.Extensions.Logging;
using Rena.GameEngine;
using Rena.Server.Rendering;
using Rena.Utility;

namespace Rena.Server.GameSockets;

internal interface IGameRoomManager
{
    Task<Result<ChannelReader<Result<bool>>>> RegisterForTest(string playerId, WebSocket socket);
    Task UnRegister(string playerId);
    Result<RenderableBroadcaster> GetBroadcasterForPlayer(string playerId);
}

internal class GameRoomManager<G, S, A>(IMatchMaker<G, S, A> matchMaker, int roomSize, ILogger logger) : IGameRoomManager
    where G : IGame<S, A>, new()
    where S : class
    where A : class
{
    private const int EXPECTED_NUM_MESSAGES = 1;
    private readonly ConcurrentDictionary<string, ChannelWriter<Result<bool>>> _channels = [];
    private readonly ConcurrentDictionary<string, GameRoom<G, S, A>> _rooms = [];
    public bool IsCompetitionMode { get; set; } = false;

    private readonly Lock _roomStartLock = new();

    public async Task<Result<ChannelReader<Result<bool>>>> RegisterForTest(string playerId, WebSocket socket)
    {
        logger.LogInformation("Registering {playerId} for test", playerId);
        if (_rooms.ContainsKey(playerId))
        {
            return new(new ArgumentException("Player already connected. Please disconnect before trying again."));
        }

        var getRoomResult = await matchMaker.GetTestRoom(playerId, roomSize);

        if (!getRoomResult.IsSuccess)
        {
            return new(getRoomResult.Exception!);
        }

        var room = getRoomResult.Value!;

        var channel = Channel.CreateBounded<Result<bool>>(EXPECTED_NUM_MESSAGES);
        bool sucessfullyAddedPlayer = room.AddPlayer(playerId, new(socket, channel.Writer));

        // player failed to join room
        if (!sucessfullyAddedPlayer)
        {
            return new(new Exception("Player could not join the room. They already in the room. This should never happen"));
        }

        _channels[playerId] = channel.Writer;
        _rooms[playerId] = room;

        lock (_roomStartLock)
        {
            if (room.IsFull && !room.IsStarted)
            {
                logger.LogInformation("Player {playerId} is starting the room", playerId);
                Task.Run(room.RunRoom).SafeFireAndForget(async exception => await this.HandleRoomExceptions(exception, room.PlayerIds));
            }
        }

        return new(channel.Reader);
    }

    public async Task UnRegister(string playerId)
    {
        // The actual management of websockets and their disconnect/error handling is
        // handled by GameSocketConnection and GameSocketHandler
        _rooms[playerId].RemovePlayer(playerId);
        _channels.TryRemove(playerId, out _);
        _rooms.TryRemove(playerId, out _);
        matchMaker.RemovePlayer(playerId);
    }

    public Result<RenderableBroadcaster> GetBroadcasterForPlayer(string playerId)
    {
        if (!this._rooms.TryGetValue(playerId, out GameRoom<G, S, A>? room))
        {
            return new(new ArgumentException("This player doesn't have a room"));
        }
        if (room.RenderableWatcher is RenderableBroadcaster broadcaster)
        {
            return new(broadcaster);
        }
        return new(new ArgumentException("This room isn't watchable. Are you sure you can be can be here?"));
    }

    private async Task HandleRoomExceptions(Exception e, ICollection<string> affectedPlayers)
    {
        logger.LogError(
            "[UnnexpectedGameError]: Something went wrong while playing the game | {error message} | {stacktrace}",
            e.Message,
            e.StackTrace
        );

        foreach (string playerId in affectedPlayers)
        {
            if (!_channels.TryGetValue(playerId, out ChannelWriter<Result<bool>>? channel))
                continue;
            // This should theoretically deal with unregistering the correct connections
            await channel.WriteAsync(new(e));
        }
    }
}
