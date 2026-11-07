using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Threading.Channels;
using AsyncAwaitBestPractices;
using Microsoft.Extensions.Logging;
using Rena.GameEngine;
using Rena.Utility;

namespace Rena.Server.GameSockets;

public interface IGameRoomManager
{
    Task<ChannelReader<Result<bool>>> RegisterForTest(string playerId, WebSocket socket);
    Task UnRegister(string playerId);
}

public class GameRoomManager<G, S, A>(IMatchMaker<G, S, A> matchMaker, int roomSize, ILogger logger) : IGameRoomManager
    where G : IGame<S, A>, new()
    where S : class
    where A : class
{
    private const int EXPECTED_NUM_MESSAGES = 1;
    private readonly ConcurrentDictionary<string, Tuple<WebSocket, ChannelWriter<Result<bool>>>> _connections = [];
    private readonly ConcurrentDictionary<string, GameRoom<G, S, A>> _rooms = [];
    public bool IsCompetitionMode { get; set; } = false;

    private readonly Lock _roomStartLock = new();

    public async Task<ChannelReader<Result<bool>>> RegisterForTest(string playerId, WebSocket socket)
    {
        logger.LogInformation("Registering {playerId} for test", playerId);
        var channel = Channel.CreateBounded<Result<bool>>(EXPECTED_NUM_MESSAGES);
        if (_connections.ContainsKey(playerId))
        {
            await channel.Writer.WriteAsync(new(new ArgumentException("Player already connected. Please disconnect before trying again.")));
            return await Task.FromResult(channel.Reader);
        }

        _connections[playerId] = new(socket, channel.Writer);

        var room = await matchMaker.GetTestRoom(playerId, roomSize);
        var result = room.AddPlayer(playerId, new(socket, channel.Writer));

        // player failed to join room
        if (result.IsSuccess && !result.Value)
        {
            await channel.Writer.WriteAsync(new(new Exception("Player could not join the room.")));
            return await Task.FromResult(channel.Reader);
        }
        else if (!result.IsSuccess)
        {
            await channel.Writer.WriteAsync(new(result.Exception!));
            return await Task.FromResult(channel.Reader);
        }

        _rooms[playerId] = room;

        lock (_roomStartLock)
        {
            if (room.IsFull && !room.IsStarted)
            {
                logger.LogInformation("Player {playerId} is starting the room", playerId);
                Task.Run(room.RunRoom).SafeFireAndForget(async exception => await this.HandleRoomExceptions(exception, new(room.Players)));
            }
        }

        return await Task.FromResult(channel.Reader);
    }

    public async Task UnRegister(string playerId)
    {
        // The actual management of websockets and their disconnect/error handling is
        // handled by GameSocketConnection and GameSocketHandler
        _connections.TryRemove(playerId, out _);
        _rooms.TryRemove(playerId, out _);
    }

    private async Task HandleRoomExceptions(Exception e, Dictionary<string, Tuple<WebSocket, ChannelWriter<Result<bool>>>> affectedConnections)
    {
        logger.LogError(
            "[UnnexpectedGameError]: Something went wrong while playing the game | {error message} | {stacktrace}",
            e.Message,
            e.StackTrace
        );

        foreach (var connection in affectedConnections.Values)
        {
            // This should theoretically deal with unregistering the correct connections
            await connection.Item2.WriteAsync(new(e));
        }
    }
}
