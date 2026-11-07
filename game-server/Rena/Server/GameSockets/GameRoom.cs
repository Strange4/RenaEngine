using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Threading.Channels;

using Microsoft.Extensions.Logging;

using ProtoBuf;

using Rena.GameEngine;
using Rena.Utility;

namespace Rena.Server.GameSockets;

public class GameRoom<G, S, A>
    where G : IGame<S, A>, new()
    where S : class
    where A : class
{
    private readonly ConcurrentDictionary<string, Tuple<WebSocket, ChannelWriter<Result<bool>>>> _connections;
    private readonly int _roomSize;
    private readonly ILogger _logger;

    public bool IsStarted { get; private set; } = false;

    public bool IsFull => _connections.Count >= _roomSize;

    public ConcurrentDictionary<string, Tuple<WebSocket, ChannelWriter<Result<bool>>>> Players => _connections;

    public GameRoom(int roomSize, ILogger logger)
    {
        _connections = [];
        _roomSize = roomSize;
        _logger = logger;
    }

    public GameRoom(Dictionary<string, Tuple<WebSocket, ChannelWriter<Result<bool>>>> connections)
    {
        _connections = new(connections);
        _roomSize = _connections.Count;
    }

    public Result<bool> AddPlayer(string playerId, Tuple<WebSocket, ChannelWriter<Result<bool>>> connectionInfo)
    {
        bool success = _connections.TryAdd(playerId, connectionInfo);
        return new(success);
    }

    public async Task RunRoom()
    {
        this._logger.LogDebug("Starting the room");
        this.IsStarted = true;

        IGame<S, A> game = new G();
        Dictionary<string, S> statesToSend = game.GetInitial([.. _connections.Keys]);
        while (this.IsStarted)
        {
            this._logger.LogDebug("playing a turn in the room");
            Dictionary<string, A> actions = await this.SendAndWaitForResult(statesToSend);
            statesToSend = game.DoAction(actions);
            // TODO: broadcast renderer changes here
            if (game.IsGameOver())
            {
                this.IsStarted = false;
                break;
            }
        }

        this._logger.LogDebug("ended the game");
        // The game has ended. Please return to your posts
        foreach (var id in _connections.Keys.ToList())
        {
            await _connections[id].Item2.WriteAsync(new(true));
        }
    }

    private async Task<Dictionary<string, A>> SendAndWaitForResult(Dictionary<string, S> playerToState)
    {
        foreach ((string id, S state) in playerToState)
        {
            this._logger.LogDebug("sedning state to player {id}", id);
            (WebSocket connection, ChannelWriter<Result<bool>> endGameListener) = _connections[id];
            using MemoryStream stream = new();
            Serializer.Serialize(stream, state);
            // TODO: put a cancelation token for timeout based on settings
            // TODO: break down the message in to smaller ones instead of sending it all at once
            await connection.SendAsync(new ArraySegment<byte>(stream.ToArray()), WebSocketMessageType.Binary, true, CancellationToken.None);
        }

        Dictionary<string, A> results = [];

        foreach ((string id, var _) in playerToState)
        {
            (WebSocket connection, ChannelWriter<Result<bool>> endGameListener) = _connections[id];

            bool done = false;
            byte[] buffer = new byte[1024];
            using MemoryStream stream = new();

            while(!done){
                WebSocketReceiveResult result = await connection.ReceiveAsync(buffer, CancellationToken.None);
                stream.Write(buffer, 0, result.Count);
                done = result.EndOfMessage;
            }

            A action = Serializer.Deserialize<A>(stream);
            results.Add(id, action);
        }

        return results;
    }

    // Parts of this may be useful once I connect this to the actual game
    // var buffer = new byte[BUFFER_SIZE];

    // while (true)
    // {
    //     WebSocketReceiveResult result = await webSocket.ReceiveAsync(buffer, CancellationToken.None);

    //     if (result.MessageType == WebSocketMessageType.Close)
    //     {
    //         // Respond to the client's close request to complete the handshake cleanly
    //         await webSocket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "Closing Normally", CancellationToken.None);
    //         break;
    //     }

    //     _currentMessage.AddRange(new ArraySegment<byte>(buffer, 0, result.Count));

    //     // Must receive the whole message before continuing
    //     // Setup for when we will be receiving Action objects from frontend
    //     if (!result.EndOfMessage)
    //     {
    //         continue;
    //     }

    //     // Read received text string from accumulated bytes
    //     string message = Encoding.UTF8.GetString([.. _currentMessage]);
    //     logger.LogInformation("{PlayerId} - Received: {message}", playerId, message);

    //     // Echo a response back
    //     var responseBytes = Encoding.UTF8.GetBytes($"Echo: {message}\n");
    //     await webSocket.SendAsync(responseBytes, result.MessageType, true, CancellationToken.None);

    //     // Reset the message
    //     _currentMessage.Clear();
    // }
}
