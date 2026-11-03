using System.Net.WebSockets;

namespace Rena.Server.GameSockets;

using Microsoft.Extensions.Logging;
using Rena.GameEngine;

public class GameSocketConnection<G, S, A>(WebSocket webSocket, string playerId, IGameRoomManager gameRoomManager, ILogger logger)
    where G : IGame<S, A>
    where S : class
    where A : class
{
    private const int BUFFER_SIZE = 1024;

    public string PlayerId => playerId;

    private readonly List<byte> _currentMessage = new(BUFFER_SIZE);

    public virtual async Task HandleConnection()
    {
        logger.LogInformation("Registering {playerId} into game manager", playerId);
        var channel = await gameRoomManager.Register(playerId, webSocket);

        var result = await channel.ReadAsync();

        logger.LogInformation("Unregistering {playerId} from game manager", playerId);
        await gameRoomManager.UnRegister(playerId);

        if (result.IsSuccess)
        {
            logger.LogInformation("Player {playerId} completed a normal game", playerId);
            await webSocket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "Closing Normally", CancellationToken.None);
            return;
        }

        switch (result.Exception)
        {
            case ArgumentException:
                logger.LogWarning("Player {playerId} tried to connect again while connected", playerId);
                await webSocket.CloseOutputAsync(WebSocketCloseStatus.PolicyViolation, result.Exception.Message, CancellationToken.None);
                break;
            default:
                logger.LogError(
                    "[UnnexpectedError]: Something went wrong while {playerId} was playing a game | {error message} | {stacktrace}",
                    playerId,
                    result.Exception!.Message,
                    result.Exception!.StackTrace
                );
                await webSocket.CloseOutputAsync(WebSocketCloseStatus.InternalServerError, "Something unnexpected happened", CancellationToken.None);
                break;
        }
    }
}
