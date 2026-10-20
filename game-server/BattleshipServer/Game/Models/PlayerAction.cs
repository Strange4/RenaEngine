using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class PlayerAction
{
    [DataMember(Order = 1)] public List<Ship> PlaceShips { get; init; } = new List<Ship>();
    [DataMember(Order = 2)] public Coordinate ShootAt { get; init; } = new Coordinate();
}
