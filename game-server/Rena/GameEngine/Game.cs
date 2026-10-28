namespace Rena.GameEngine;

public interface IGame<S, A>
    where S : class
    where A : class
{
    Dictionary<string, S> OnCreate(HashSet<string> playerIDs);
    Dictionary<string, S> DoAction(Dictionary<string, A> playerToAction);

    public string GetName();
}
