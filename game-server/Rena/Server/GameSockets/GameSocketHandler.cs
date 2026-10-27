using System.Net.WebSockets;

using Microsoft.AspNetCore.Http;

namespace Rena.Server.GameSockets;

using Microsoft.Extensions.Logging;

using Rena.GameEngine;

public class GameSocketHandler<G, S, A>(ILogger<GameSocketHandler<G, S, A>> logger)
where G : IGame<S, A>
where S : class
where A : class
{

    public async Task GameConnect(HttpContext context, string playerId)
    {

        if (!context.WebSockets.IsWebSocketRequest)
        {
            logger.LogInformation("{ConnectionId}: Not a websocket request, rejecting", context.Connection.Id);
            context.Response.StatusCode = 400;
            return;
        }

        if (string.IsNullOrWhiteSpace(playerId))
        {
            logger.LogInformation("{ConnectionId}: Missing required PlayerId, rejecting", context.Connection.Id);
            context.Response.StatusCode = 400;
            return;
        }

        WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();

        GameSocketConnection<G, S, A> gameConnection = new(webSocket, playerId, logger);

        try
        {
            await gameConnection.HandleConnection();
        }
        catch (Exception e)
        {
            logger.LogError("[UnnexpectedConnectionError]: Something went wrong with {ConnectionId} | {error message} | {stacktrace}",
                context.Connection.Id,
                e.Message,
                e.StackTrace
            );
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
