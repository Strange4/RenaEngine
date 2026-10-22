using System.Net.WebSockets;
using System.Text;

using Microsoft.AspNetCore.Connections;

namespace Rena.Server.GameSockets;

using Rena.GameEngine;

public class GameSocketConnection<G, S, A>(ConnectionContext connection, WebSocket webSocket, string playerId)
where G : IGame<S, A>
where S : class
where A : class
{

    public string PlayerId => playerId;

    public async Task HandleConnection()
    {
        var reader = connection!.Transport.Input;
        var writer = connection.Transport.Output;

        while (true)
        {

            if (webSocket != null && webSocket.State == WebSocketState.CloseReceived)
            {
                // Respond to the client's close request to complete the handshake cleanly
                await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure,
                    "Closing Normally",
                    CancellationToken.None);
                break;
            }

            var result = await reader.ReadAsync();
            var buffer = result.Buffer;

            if (buffer.IsEmpty && result.IsCompleted)
            {
                Console.WriteLine($"Connection {connection.ConnectionId} lost");
                break;
            }

            // Read incoming text string from buffer
            string message = Encoding.UTF8.GetString(buffer);
            Console.WriteLine($"Received: {message}");

            // Tell the reader we have consumed the bytes
            reader.AdvanceTo(buffer.End);

            // Echo a response back
            var responseBytes = Encoding.UTF8.GetBytes($"Echo: {message}\n");
            await writer.WriteAsync(responseBytes);
        }
    }
}
