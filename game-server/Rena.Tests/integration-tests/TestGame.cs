using System.Runtime.Serialization;
using Microsoft.Extensions.Logging;
using Rena.GameEngine;
using Rena.Server.Rendering;

namespace Rena.Tests.Integration;

[DataContract]
public class GameState
{
    [DataMember(Order = 1)]
    public int X;
}

[DataContract]
public class GameAction
{
    [DataMember(Order = 1)]
    public int Y;
}

public class TestGame : IGame<GameState, GameAction>
{
    public readonly GameState State = new() { X = 0 };
    public bool IsOver = false;
    public ILogger? Logger { get; set; }

    public string GetName() => "Example game";

    public Dictionary<string, GameState> GetInitial(HashSet<string> players)
    {
        return players.ToDictionary(player => player, _ => State);
    }

    public Dictionary<string, GameState> DoAction(Dictionary<string, GameAction> actions)
    {
        Dictionary<string, GameState> playerStates = [];
        foreach (var (player, action) in actions)
        {
            // if they input the number 7 the game is over and they "win"
            if (action.Y == 7)
            {
                IsOver = true;
                GameState winState = new() { X = 1 };
                playerStates.Add(player, winState);
            }
            else
            {
                playerStates.Add(player, State);
            }
        }
        return playerStates;
    }

    public bool IsGameOver() => IsOver;

    public List<GameRenderable> CollectRenderables() => [];
}
