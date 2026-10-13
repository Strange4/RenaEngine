using System.Runtime.Serialization;
using Rena.GameEngine;

namespace Rena.Tests;

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
    public string GetName()
    {
        return "Example game";
    }
}
