using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class PlayerAction
{
    [DataMember(Order = 1)] public List<ShipState> PlaceShips { get; init; } = new List<ShipState>();
    [DataMember(Order = 2)] public Coordinate ShootAt { get; init; } = new Coordinate();
}
