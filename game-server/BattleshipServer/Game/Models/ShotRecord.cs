using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class ShotRecord
{
    [DataMember(Order = 1)]
    public Coordinate Coordinate { get; init; } = new Coordinate();

    [DataMember(Order = 2)]
    public ShotResult Result { get; init; } = ShotResult.Miss;
}
