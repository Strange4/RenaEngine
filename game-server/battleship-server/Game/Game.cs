using System.Runtime.Serialization;

using Rena.GameEngine;

namespace Battleship_server.Game;

class BattleshipGame : IGame<PlayerState, PlayerAction>
{
    public string GetName()
    {
        return "Battleship";
    }
}

[DataContract]
class PlayerState
{
    [DataMember(Order = 1)]
    List<bool> Grid;

    [DataMember]
    int GridSize;
}

[DataContract]
class PlayerAction
{
    [DataMember(Order = 1)]
    int X;
    [DataMember(Order = 2)]
    int Y;
}
