using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class Ship
{
    [DataMember(Order = 1)]
    public ShipName Name { get; init; } = ShipName.ShipNameUnknown;

    [DataMember(Order = 2)]
    public ShipOrientation Orientation { get; init; } = ShipOrientation.ShipOrientationUnknown;

    [DataMember(Order = 3)]
    public Coordinate StartCoordinate { get; init; } = new Coordinate();

    [DataMember(Order = 4)]
    public int Size
    {
        // We need to have an init; since Protobuf may want to deserialize this.
        // But we don't really want to deserialize this. And this must always be set to the size of the name of the ship
#pragma warning disable CS9266
        get => GetShipSize(this.Name);
#pragma warning restore CS9266
        init;
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
            _ => 0,
        };
    }

    public bool IsOutsideBoard(int boardSize)
    {
        // Convention: Horizontal ships are placed from left to right, vertical ships are placed from top to bottom
        if (this.Size == 0)
            return true;
        if (this.StartCoordinate.X < 0 || this.StartCoordinate.Y < 0)
            return true;
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

    public bool IsShipSunk(List<ShotRecord> shotsFired)
    {
        bool isHorizontal = this.Orientation == ShipOrientation.Horizontal;
        for (int i = 0; i < this.Size; i++)
        {
            int x = isHorizontal ? this.StartCoordinate.X + i : this.StartCoordinate.X;
            int y = isHorizontal ? this.StartCoordinate.Y : this.StartCoordinate.Y + i;
            if (!shotsFired.Any(s => s.Coordinate.X == x && s.Coordinate.Y == y))
                return false;
        }
        return true;
    }
}
