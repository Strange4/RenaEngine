using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public enum ShotResult
{
    ShotResultUnknown = 0,
    Hit = 1,
    Miss = 2,
    Sunk = 3,
}

[DataContract]
public enum ShipOrientation
{
    ShipOrientationUnknown = 0,
    Horizontal = 1,
    Vertical = 2
}

[DataContract]
public enum ShipName
{
    ShipNameUnknown = 0,
    Carrier = 1,
    Battleship = 2,
    Cruiser = 3,
    Submarine = 4,
    Destroyer = 5
}

public enum PlacementResult
{
    UnknownName,
    UnknownOrientation,
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

public enum ActionStatus
{
    UnknownAction,
    Success,
    InvalidPlayerNumber,
    NotYourTurn,
    AlreadyFired,
    OutOfBounds,
    NullCoordinate,
    NullShotRecord,
    NotReadyToStart,
    GameOver,
    InvalidPlacement,
    InvalidAction
}
