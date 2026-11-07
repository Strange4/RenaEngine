using Rena.Server.Rendering;

namespace Rena.GameEngine;

public interface IGame<S, A>
    where S : class
    where A : class
{
    public string GetName();
    public Dictionary<string, S> GetInitial(HashSet<string> playerIDs);
    public Dictionary<string, S> DoAction(Dictionary<string, A> playerToAction);
    public bool IsGameOver();

    public void SetBroadcaster(RenderableBroadcaster renderableBroadcaster);
}
