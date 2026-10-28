using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class PlayerState
{
    [DataMember(Order = 1)]
    public int GridSize { get; init; } = 10;

    [DataMember(Order = 2)]
    public List<Ship> Ships { get; init; } = new List<Ship>();

    [DataMember(Order = 3)]
    public List<Ship> SunkShips { get; init; } = new List<Ship>();

    [DataMember(Order = 4)]
    public List<ShotRecord> ShotsFired { get; init; } = new List<ShotRecord>();

    [DataMember(Order = 6)]
    public bool isGameOver { get; init; } = false;

    [DataMember(Order = 7)]
    public bool isWinner { get; init; } = false;

    [DataMember(Order = 8)]
    public bool isPlacementPhase { get; init; } = false;
}
