using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public enum ShotResult
{
    [EnumMember] ShotResultUnknown = 0,
    [EnumMember] Hit = 1,
    [EnumMember] Miss = 2,
    [EnumMember] Sunk = 3,
}

[DataContract]
public enum ShipOrientation
{
    [EnumMember] ShipOrientationUnknown = 0,
    [EnumMember] Horizontal = 1,
    [EnumMember] Vertical = 2
}

[DataContract]
public enum ShipName
{
    [EnumMember] ShipNameUnknown = 0,
    [EnumMember] Carrier = 1,
    [EnumMember] Battleship = 2,
    [EnumMember] Cruiser = 3,
    [EnumMember] Submarine = 4,
    [EnumMember] Destroyer = 5
}

public enum PlacementResult
{
    UnknownName,
    UnknownOrientation,
    UnknownShotResult,
    Success,
    InvalidPlayerNumber,
    AlreadyPlaced,
    OutOfBounds,
    Overlapping,
    InvalidFleetComposition,
    InvalidFleetSize,
    NullFleet,
    NullCoordinate,
    NullShip,

}
