using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Http.Connections;

namespace Rena.Server.GameSockets;

using Rena.GameEngine;

public class GameSocketHandler<G, S, A> : ConnectionHandler
where G : IGame<S, A>
where S : class
where A : class
{

    public override async Task OnConnectedAsync(ConnectionContext connection)
    {

        var context = connection.GetHttpContext();

        if (context == null || !context.WebSockets.IsWebSocketRequest)
        {
            Console.WriteLine("Not a websocket request, rejecting");
            return;
        }

        var webSocket = await context.WebSockets.AcceptWebSocketAsync();

        if (webSocket is null)
        {
            Console.WriteLine("Couldn't accept websocket request");
            return;
        }

        var playerId = context.Request.Query["playerId"].ToString();

        GameSocketConnection<G, S, A> gameConnection = new(connection, webSocket, playerId);

        if (playerId is null) return;

        try
        {
            await gameConnection.HandleConnection();
        }
        catch (Exception e)
        {
            Console.WriteLine($"[UnnexpectedConnectionError]: Something went wrong with {connection.ConnectionId} | {e.Message}");
        }
        finally
        {
            Console.WriteLine("Aborting Connection");
            connection.Abort();
        }

    }

}
