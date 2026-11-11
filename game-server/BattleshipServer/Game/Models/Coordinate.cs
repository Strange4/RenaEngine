using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class Coordinate
{
    [DataMember(Order = 1)]
    public int X { get; init; }

    [DataMember(Order = 2)]
    public int Y { get; init; }
}
