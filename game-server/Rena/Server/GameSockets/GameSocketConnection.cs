using System.Net.WebSockets;

namespace Rena.Server.GameSockets;

using Microsoft.Extensions.Logging;
using Rena.GameEngine;

internal class GameSocketConnection<G, S, A>(WebSocket webSocket, string playerId, IGameRoomManager gameRoomManager, ILogger logger)
    where G : IGame<S, A>
    where S : class
    where A : class
{
    public string PlayerId => playerId;

    public async Task HandleConnection()
    {
        logger.LogInformation("Registering {playerId} into game manager", playerId);
        var registerResult = await gameRoomManager.RegisterForTest(playerId, webSocket);

        if (!registerResult.IsSuccess)
        {
            logger.LogError(registerResult.Exception, "Could not register {playerId} to a game", playerId);
            WebSocketCloseStatus closeStatus =
                registerResult.Exception is ArgumentException ? WebSocketCloseStatus.PolicyViolation : WebSocketCloseStatus.InternalServerError;
            string closeReason = registerResult.Exception is ArgumentException ? registerResult.Exception.Message : "Something unnexpected happened";
            await webSocket.CloseOutputAsync(closeStatus, closeReason, CancellationToken.None);
            return;
        }
        var channel = registerResult.Value!;
        var roomResult = await channel.ReadAsync();

        logger.LogInformation("Unregistering {playerId} from game manager", playerId);
        await gameRoomManager.UnRegister(playerId);

        if (roomResult.IsSuccess)
        {
            logger.LogInformation("Player {playerId} completed a normal game", playerId);
            await webSocket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "Closing Normally", CancellationToken.None);
            return;
        }

        switch (roomResult.Exception)
        {
            case ArgumentException:
                logger.LogWarning("Player {playerId} tried to connect again while connected", playerId);
                await webSocket.CloseOutputAsync(WebSocketCloseStatus.PolicyViolation, roomResult.Exception.Message, CancellationToken.None);
                break;
            default:
                logger.LogError(
                    "[UnnexpectedError]: Something went wrong while {playerId} was playing a game | {error message} | {stacktrace}",
                    playerId,
                    roomResult.Exception!.Message,
                    roomResult.Exception!.StackTrace
                );
                await webSocket.CloseOutputAsync(WebSocketCloseStatus.InternalServerError, "Something unnexpected happened", CancellationToken.None);
                break;
        }
    }
}
