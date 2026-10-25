using System.Net.WebSockets;

using Microsoft.AspNetCore.Http;

namespace Rena.Server.GameSockets;

using Rena.GameEngine;

public class GameSocketHandler<G, S, A>
where G : IGame<S, A>
where S : class
where A : class
{

    public static async Task GameConnect(HttpContext context)
    {

        if (!context.WebSockets.IsWebSocketRequest)
        {
            Console.WriteLine("Not a websocket request, rejecting");
            context.Response.StatusCode = 400;
            return;
        }

        var playerId = context.Request?.RouteValues["playerId"]?.ToString();

        if (string.IsNullOrWhiteSpace(playerId))
        {
            Console.WriteLine("Missing required PlayerId, rejecting");
            context.Response.StatusCode = 400;
            return;
        }

        WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();

        GameSocketConnection<G, S, A> gameConnection = new(webSocket, playerId);

        try
        {
            await gameConnection.HandleConnection();
        }
        catch (Exception e)
        {
            Console.WriteLine($"[UnnexpectedConnectionError]: Something went wrong with {context.Connection.Id} | {e.Message}");
            Console.WriteLine(e.Message);
            Console.WriteLine(e.StackTrace);
            if (webSocket.State == WebSocketState.Open)
            {
                await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError,
                    "Something unnexpected happened",
                    CancellationToken.None
                );
            }
        }
        finally
        {
            webSocket.Dispose();
        }

    }

}
