using BattleshipServer.Game.Models;

using Rena.GameEngine;

namespace BattleshipServer.Game;

class BattleshipGame : IGame<PlayerState, PlayerAction>
{
    public string GetName()
    {
        return "Battleship";
    }
}
