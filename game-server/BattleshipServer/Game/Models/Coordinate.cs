using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class Coordinate
{
    [DataMember(Order = 1)] public int X { get; init; } = 0;
    [DataMember(Order = 2)] public int Y { get; init; } = 0;
}
