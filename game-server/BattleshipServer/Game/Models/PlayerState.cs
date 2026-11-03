using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class PlayerState
{
    [DataMember(Order = 1)]
    public int GridSize { get; init; } = 10;

    [DataMember(Order = 2)]
    public List<Ship> Ships { get; init; } = [];

    [DataMember(Order = 3)]
    public List<Ship> SunkShips { get; init; } = [];

    [DataMember(Order = 4)]
    public List<ShotRecord> ShotsFired { get; init; } = [];

    [DataMember(Order = 6)]
    public bool IsGameOver { get; init; } = false;

    [DataMember(Order = 7)]
    public bool IsWinner { get; init; } = false;

    [DataMember(Order = 8)]
    public bool IsPlacementPhase { get; init; } = false;
}
