using BattleshipServer.Game.Models;
using Rena.GameEngine;

namespace BattleshipServer.Game;

public class BattleshipGame : IGame<PlayerState, PlayerAction>
{
    public string GetName()
    {
        return "Battleship";
    }
}
