using System.Runtime.Serialization;
using NSubstitute;
using Rena.GameEngine;
using Rena.Server.Rendering;

namespace Rena.Tests.SharedMocks;

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
    public IGame<GameState, GameAction> Mock { get; } = Substitute.For<IGame<GameState, GameAction>>();

    public string GetName() => this.Mock.GetName();

    public Dictionary<string, GameState> GetInitial(HashSet<string> players) => this.Mock.GetInitial(players);

    public Dictionary<string, GameState> DoAction(Dictionary<string, GameAction> actions) => this.Mock.DoAction(actions);

    public bool IsGameOver() => this.Mock.IsGameOver();

    public void SetBroadcaster(RenderableBroadcaster broadcaster) => this.Mock.SetBroadcaster(broadcaster);
}
