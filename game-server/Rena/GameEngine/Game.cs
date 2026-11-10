using Microsoft.Extensions.Logging;

using Rena.Server.Rendering;

namespace Rena.GameEngine;

public interface IGame<S, A>
    where S : class
    where A : class
{
    /// <summary>Gets the display name of the game.</summary>
    public string GetName();

    /// <summary>Creates the initial player states for a game.</summary>
    /// <param name="playerIDs">The IDs of the players participating in the game.</param>
    /// <returns>Initial states keyed by the IDs of the players they belong to.</returns>
    public Dictionary<string, S> GetInitial(HashSet<string> playerIDs);

    /// <summary>
    ///     Applies player actions and produces the resulting player states.
    ///     The produced player states will be sent to the corresponding players.
    ///     The corresponding players will send an action on the next turn.
    /// </summary>
    /// <param name="playerToAction">Actions keyed by the IDs of the players who submitted them.</param>
    /// <returns>Updated states keyed by the IDs of the players they belong to.</returns>
    public Dictionary<string, S> DoAction(Dictionary<string, A> playerToAction);

    /// <summary>Indicates whether the game has ended.</summary>
    /// <returns><see langword="true"/> if the game is over; otherwise, <see langword="false"/>.</returns>
    public bool IsGameOver();

    /// <summary>Gets the renderables that represent the game visually.</summary>
    /// <returns>The game's renderable objects.</returns>
    public List<GameRenderable> CollectRenderables();

    public ILogger<IGame<S, A>> Logger { set; get; }
}
