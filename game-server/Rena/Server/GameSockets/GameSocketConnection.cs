using System.Net.WebSockets;
using System.Text;

namespace Rena.Server.GameSockets;

using Microsoft.Extensions.Logging;

using Rena.GameEngine;

public class GameSocketConnection<G, S, A>(WebSocket webSocket, string playerId, ILogger logger)
where G : IGame<S, A>
where S : class
where A : class
{
    private const int BUFFER_SIZE = 1024;

    public string PlayerId => playerId;

    private readonly List<byte> _currentMessage = new(BUFFER_SIZE);

    public virtual async Task HandleConnection()
    {
        var buffer = new byte[BUFFER_SIZE];

        while (true)
        {

            WebSocketReceiveResult result = await webSocket.ReceiveAsync(buffer, CancellationToken.None);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                // Respond to the client's close request to complete the handshake cleanly
                await webSocket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure,
                    "Closing Normally",
                    CancellationToken.None);
                break;
            }

            _currentMessage.AddRange(new ArraySegment<byte>(buffer, 0, result.Count));

            // Must receive the whole message before continuing
            // Setup for when we will be receiving Action objects from frontend
            if (!result.EndOfMessage)
            {
                continue;
            }

            // Read received text string from accumulated bytes
            string message = Encoding.UTF8.GetString([.. _currentMessage]);
            logger.LogInformation("{PlayerId} - Received: {message}", playerId, message);

            // Echo a response back
            var responseBytes = Encoding.UTF8.GetBytes($"Echo: {message}\n");
            await webSocket.SendAsync(responseBytes, result.MessageType, true, CancellationToken.None);

            // Reset the message
            _currentMessage.Clear();
        }
    }
}
