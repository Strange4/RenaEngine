using System.Runtime.Serialization;
using ProtoBuf;

namespace BattleshipServer.Game.Models;

[DataContract]
[ProtoContract]
[ProtoInclude(1, typeof(PlaceShipsAction))]
[ProtoInclude(2, typeof(ShootAction))]
public abstract class PlayerAction;

[DataContract]
[ProtoContract]
public class PlaceShipsAction : PlayerAction
{
    [ProtoMember(1)]
    [DataMember(Order = 1)]
    public List<Ship> Ships { get; init; } = [];
}

[DataContract]
[ProtoContract]
public class ShootAction : PlayerAction
{
    [ProtoMember(1, IsRequired = true)]
    [DataMember(Order = 1)]
    public Coordinate ShootAt { get; init; } = new Coordinate();
}
