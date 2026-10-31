using System.Net.WebSockets;
using System.Text;
using System.Threading.Channels;
using Rena.GameEngine;
using Rena.Utility;

namespace Rena.Server.GameSockets;

public class GameRoom<G, S, A>(Dictionary<string, Tuple<WebSocket, ChannelWriter<Result<bool>>>> connections)
    where G : IGame<S, A>, new()
    where S : class
    where A : class
{
    public async Task RunRoom()
    {
        // Need to snapshot in case a connection closes while sending
        foreach (var id in connections.Keys.ToList())
        {
            var responseBytes = Encoding.UTF8.GetBytes($"You, player {id}, have connected to the game\n");
            try
            {
                await connections[id].Item1.SendAsync(responseBytes, WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch (OperationCanceledException e)
            {
                await connections[id].Item2.WriteAsync(new(e));
            }
        }

        Thread.Sleep(1000);

        foreach (var id in connections.Keys.ToList())
        {
            await connections[id].Item2.WriteAsync(new(true));
        }
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
