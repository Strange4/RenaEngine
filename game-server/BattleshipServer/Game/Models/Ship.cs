using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class Ship
{
    [DataMember(Order = 1)] public ShipName Name { get; init; } = ShipName.ShipNameUnknown;
    [DataMember(Order = 2)] public ShipOrientation Orientation { get; init; } = ShipOrientation.ShipOrientationUnknown;
    [DataMember(Order = 3)] public Coordinate StartCoordinate { get; init; } = new Coordinate();
    [DataMember(Order = 4)]
    public int Size
    {
        get => GetShipSize(this.Name);
    }

    private static int GetShipSize(ShipName name)
    {
        return name switch
        {
            ShipName.Carrier => 5,
            ShipName.Battleship => 4,
            ShipName.Cruiser => 3,
            ShipName.Submarine => 3,
            ShipName.Destroyer => 2,
            _ => 0
        };
    }

    public bool IsOutsideBoard(int boardSize)
    {
        // Convention: Horizontal ships are placed from left to right, vertical ships are placed from top to bottom
        if (this.Size == 0) return true;
        if (this.StartCoordinate.X < 0 || this.StartCoordinate.Y < 0) return true;
        if (this.Orientation == ShipOrientation.Horizontal)
        {
            return (this.StartCoordinate.X + this.Size > boardSize) || (this.StartCoordinate.Y >= boardSize);
        }
        if (this.Orientation == ShipOrientation.Vertical)
        {
            return (this.StartCoordinate.X >= boardSize) || (this.StartCoordinate.Y + this.Size > boardSize);
        }
        return true;
    }
}
