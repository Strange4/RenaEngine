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
    Task<ChannelReader<Result<bool>>> Register(string playerId, WebSocket socket);
    Task UnRegister(string playerId);
}

public class GameRoomManager<G, S, A>(int roomSize, ILogger logger) : IGameRoomManager
    where G : IGame<S, A>, new()
    where S : class
    where A : class
{
    private const int EXPECTED_NUM_MESSAGES = 1;
    private readonly ConcurrentDictionary<string, Tuple<WebSocket, ChannelWriter<Result<bool>>>> _connections = [];
    private readonly ConcurrentDictionary<string, GameRoom<G, S, A>> _rooms = [];
    public bool IsCompetitionMode { get; set; } = false;

    private readonly Lock _roomCreationLock = new();

    public async Task<ChannelReader<Result<bool>>> Register(string playerId, WebSocket socket)
    {
        var channel = Channel.CreateBounded<Result<bool>>(EXPECTED_NUM_MESSAGES);
        if (_connections.ContainsKey(playerId))
        {
            await channel.Writer.WriteAsync(new(new ArgumentException("Player already connected. Please disconnect before trying again.")));
            return await Task.FromResult(channel.Reader);
        }

        _connections[playerId] = new(socket, channel.Writer);

        lock (_roomCreationLock)
        {
            if (this.IsCompetitionMode)
            {
                // TODO #133 Implement the matchmaker to keep track of who needs to play who
            }
            else
            {
                // TODO #134 Connect the docker orchestrator to spin up host agents to fill the room

                // TEMPORARY CODE
                // Fill room with the first x number of connections that are free
                var freeConnections = _connections.Where(connectionRecord =>
                    !_rooms.ContainsKey(connectionRecord.Key) && connectionRecord.Key != playerId
                );
                if (freeConnections.Count() >= roomSize - 1) // current newest connection will be in the room
                {
                    var roomConnections = freeConnections.Take(roomSize - 1).ToDictionary();
                    roomConnections[playerId] = _connections[playerId];

                    var room = new GameRoom<G, S, A>(roomConnections);

                    foreach (string id in roomConnections.Keys)
                    {
                        _rooms[id] = room;
                    }

                    Task.Run(room.RunRoom).SafeFireAndForget(async exception => await this.HandleRoomExceptions(exception, roomConnections));
                }
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
