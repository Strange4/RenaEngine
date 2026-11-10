using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Threading.Channels;
using LanguageExt;
using Microsoft.Extensions.Logging;
using ProtoBuf;
using Rena.GameEngine;
using Rena.Server.Rendering;
using Rena.Utility;

namespace Rena.Server.GameSockets;

using Connection = Tuple<WebSocket, ChannelWriter<Result<bool>>>;

public class GameRoom<G, S, A>
    where G : IGame<S, A>, new()
    where S : class
    where A : class
{
    private readonly ConcurrentDictionary<string, Connection> _connections;

    private readonly int _roomSize;
    private readonly ILogger _logger;
    private readonly RenderableBroadcaster? _broadcaster;

    public bool IsStarted { get; private set; } = false;

    public bool IsFull => _connections.Count >= _roomSize;

    public GameRoom(int roomSize, ILogger logger, RenderableBroadcaster? renderableBroadcaster = null)
    {
        _connections = [];
        _broadcaster = renderableBroadcaster;
        _roomSize = roomSize;
        _logger = logger;
    }

    public bool AddPlayer(string playerId, Connection connectionInfo)
    {
        return _connections.TryAdd(playerId, connectionInfo);
    }

    public Result<bool> RemovePlayer(string playerId)
    {
        // Might add more here tbd
        var result = _connections.TryRemove(playerId, out _);
        return new(result);
    }

    public async Task RunRoom()
    {
        this._logger.LogDebug("Starting the room");
        this.IsStarted = true;

        IGame<S, A> game = new G { Logger = this._logger };
        Dictionary<string, S> statesToSend = game.GetInitial([.. _connections.Keys]);
        while (!game.IsGameOver())
        {
            // TODO (#164): break out of this loop and return when
            // there are no longer players in this room (everyone crashed).
            this._logger.LogDebug("playing a turn in the room");
            Dictionary<string, A> actions = await this.SendAndWaitForResult(statesToSend);
            // TODO #137: Move diff renderables and broadcast changes
            // game.CollectRenderables();
            statesToSend = game.DoAction(actions);
        }

        this._logger.LogDebug("ended the game");

        // Send to all the listeners that the game ended sucessfully
        foreach (var id in _connections.Keys.ToList())
        {
            ChannelWriter<Result<bool>> waitingListener = _connections[id].Item2;
            await waitingListener.WriteAsync(new(true));
        }
    }

    public ICollection<string> PlayerIds => _connections.Keys;

    private async Task<Dictionary<string, A>> SendAndWaitForResult(Dictionary<string, S> playerToState)
    {
        foreach ((string id, S state) in playerToState)
        {
            this._logger.LogDebug("sedning state to player {id}", id);
            (WebSocket connection, ChannelWriter<Result<bool>> endGameListener) = _connections[id];
            using MemoryStream stream = new();
            Serializer.Serialize(stream, state);
            // TODO (#164): put a cancelation token for timeout based on settings
            // TODO (#164): break down the message in to smaller ones instead of sending it all at once
            await connection.SendAsync(new ArraySegment<byte>(stream.ToArray()), WebSocketMessageType.Binary, true, CancellationToken.None);
        }

        Dictionary<string, A> results = [];

        foreach ((string id, var _) in playerToState)
        {
            (WebSocket connection, ChannelWriter<Result<bool>> endGameListener) = _connections[id];

            bool done = false;
            byte[] buffer = new byte[1024];
            using MemoryStream stream = new();
            this._logger.LogDebug("receiving state from player {id}", id);
            while (!done)
            {
                WebSocketReceiveResult result = await connection.ReceiveAsync(buffer, CancellationToken.None);
                stream.Write(buffer, 0, result.Count);
                // TODO: #164 when a player is disconnected in a real game, they must have aborted
                // or the container has crashed. We should update the player status based on the docker container and remove them from the game.
                // If a real player gets disconnected from a testing game, testing game should abort (since it will be bots playing againts bots).
                done = result.EndOfMessage;
            }

            // reset the position so that the deserializer can read it
            stream.Position = 0;

            A action = Serializer.Deserialize<A>(stream);
            results.Add(id, action);
        }

        return results;
    }
}
