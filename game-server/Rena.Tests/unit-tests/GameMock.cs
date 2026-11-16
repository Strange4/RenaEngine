using System.Runtime.Serialization;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Rena.GameEngine;
using Rena.Server.Rendering;

namespace Rena.Tests.Unit;

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

public class MockGame : IGame<GameState, GameAction>
{
    private static readonly AsyncLocal<IGame<GameState, GameAction>> Current = new();
    public static IGame<GameState, GameAction> Mock
    {
        get => Current.Value ??= Substitute.For<IGame<GameState, GameAction>>();
    }

    public string GetName() => Mock.GetName();

    public Dictionary<string, GameState> GetInitial(HashSet<string> players) => Mock.GetInitial(players);

    public Dictionary<string, GameState> DoAction(Dictionary<string, GameAction> actions) => Mock.DoAction(actions);

    public bool IsGameOver() => Mock.IsGameOver();

    public List<GameRenderable> GetAllRenderables() => Mock.GetAllRenderables();

    public ILogger? Logger
    {
        get => Mock.Logger;
        set => Mock.Logger = value;
    }
}
