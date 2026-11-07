using System.Collections.Concurrent;
using LanguageExt;
using Microsoft.Extensions.Logging;
using Rena.GameEngine;
using Rena.Server.DockerManager;
using Rena.Utility;

namespace Rena.Server.GameSockets;

public interface IMatchMaker<G, S, A>
    where G : IGame<S, A>, new()
    where S : class
    where A : class
{
    /// <summary>Gets the room that the player should be in.</summary>
    /// <remarks>
    /// If the player has no room to be in, it will create a room and spin up bot containers to fill it.
    /// </remarks>
    /// <param name="playerId">The id of the player trying to get a room</param>
    /// <param name="numPlayers">The number of players that should be in a room</param>
    /// <returns>The room that the player should be in</returns>
    public Task<GameRoom<G, S, A>> GetTestRoom(string playerId, int numPlayers);

    /// <summary>
    /// Builds the docker image that the host bot containers will be based on
    /// </summary>
    /// <remarks>This must be called before using any other method</remarks>
    /// <param name="imageId">The Id of the host bot image</param>
    /// <param name="codeZipPath">The path to the zip file containing the host's bot code</param>
    /// <param name="dockerFilePath">The path to the dockerfile to create the host's bot image</param>
    /// <param name="language">The language that the bot is written in</param>
    public Task BuildHostBotImage(string imageId, string codeZipPath, string dockerFilePath, string language);
}

public class MatchMaker<G, S, A>(IDockerService dockerService, ILogger logger) : IMatchMaker<G, S, A>
    where G : IGame<S, A>, new()
    where S : class
    where A : class
{
    private string? _hostBotImageId;
    private readonly ConcurrentDictionary<string, GameRoom<G, S, A>> _playerRooms = [];
    private readonly ConcurrentDictionary<string, bool> _availableTestContainers = [];

    public async Task<GameRoom<G, S, A>> GetTestRoom(string playerId, int numPlayers)
    {
        logger.LogInformation("Getting test room for player {playerId}", playerId);
        var hasRoom = _playerRooms.TryGetValue(playerId, out GameRoom<G, S, A>? room);
        if (hasRoom)
        {
            return room!;
        }
        // Theoretically we would never have to deal with a bot creating a bot room
        // TODO #164 add a check to make sure that the player getting a test room is not part of a current room teardown
        // That way a bot that was created, who's room was shut down cannot create a room of bots
        logger.LogInformation("Creating test room for player {playerId}", playerId);
        room = new(numPlayers, logger);
        _playerRooms[playerId] = room;

        // TODO #164 add _availableTestContainers check so that we aren't always making new ones

        for (int i = 1; i < numPlayers; i++)
        {
            // Right now this will only ever spin up 1 container since we're limiting it to 1v1 for now
            // Will add the Task.WhenAll in #164
            var botId = Guid.NewGuid().ToString("N");

            // TODO get the game url from constructor?
            // TODO set the container paramaters (somehow) to map host.docker.internal to the proper gateway
            // Alternatively setup the parameters to connect to the docker network made by the compose
            // (but then you lose local testing) so it would need to be configured based on where it is running
            Dictionary<string, string> envVars = new() { ["URL"] = $"http://host.docker.internal:5000/game/connect/test/{botId}" };
            logger.LogInformation("Starting up host bot {botId}", botId);
            Result<Unit> result = await dockerService.CreateAndStartContainerWithIdAsync(botId, _hostBotImageId!, envVars);
            // TODO #164 add graceful retry or let caller know it failed
            if (!result.IsSuccess)
            {
                throw result.Exception!;
            }
            _playerRooms[botId] = room;
        }

        return room;
    }

    public async Task BuildHostBotImage(string imageId, string codeZipPath, string dockerFilePath, string language)
    {
        // TODO #164 Add error handling maybe?
        Result<string> result = await dockerService.CreateOrReplaceImageAsync(imageId, codeZipPath, dockerFilePath, language);
        _hostBotImageId = result.IsSuccess ? result.Value : throw result.Exception!;
    }
}
