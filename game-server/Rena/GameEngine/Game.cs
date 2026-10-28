namespace Rena.GameEngine;

public interface IGame<S, A>
    where S : class
    where A : class
{
    public string GetName();
}
