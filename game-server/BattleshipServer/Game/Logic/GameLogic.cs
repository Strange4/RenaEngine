using BattleshipServer.Game.Models;

namespace BattleshipServer.Logic;

public class GameLogic
{
    public const int BoardSize = 10;
    public List<ShipState> PlacedShips1 { get; } = new List<ShipState>();
    public List<ShipState> PlacedShips2 { get; } = new List<ShipState>();
    public List<ShotRecord> ShotsFired1 { get; } = new List<ShotRecord>();
    public List<ShotRecord> ShotsFired2 { get; } = new List<ShotRecord>();
    public bool IsPlayer1Turn { get; private set; } = true;
    public bool IsGameOver { get; private set; } = false;
    public bool IsPlayer1Winner { get; private set; } = false;

    public bool IsOutsideBoard(ShipState ship)
    {
        if (ship?.StartCoordinate == null) return true;
        int size = GetShipSize(ship.Name);
        if (size <= 0) return true;
        if (ship.StartCoordinate.X < 0) return true;
        if (ship.StartCoordinate.Y < 0) return true;
        if (ship.Orientation == ShipOrientation.ShipOrientationUnknown) return true;

        // Convention: Horizontal ships are placed from left to right, vertical ships are placed from top to bottom
        if (ship.Orientation == ShipOrientation.Horizontal)
        {
            if (ship.StartCoordinate.X + size > BoardSize) return true;
            if (ship.StartCoordinate.Y >= BoardSize) return true;
        }
        else if (ship.Orientation == ShipOrientation.Vertical)
        {
            if (ship.StartCoordinate.X >= BoardSize) return true;
            if (ship.StartCoordinate.Y + size > BoardSize) return true;
        }
        else
        {
            return true; // Invalid orientation
        }
        return false;
    }

    public bool HasInvalidFleetComposition(List<ShipState> ships)
    {
        if (ships == null || ships.Count != 5) return true;
        HashSet<ShipName> shipNames = new HashSet<ShipName>();
        foreach (var ship in ships)
        {
            if (ship == null || ship.Name == ShipName.ShipNameUnknown) return true;
            if (!shipNames.Add(ship.Name)) return true; // If there's a duplicate, Add will return false because HashSet does not allow duplicates
        }
        return false;
    }

    public int GetIndex(int x, int y)
    {
        return (y * BoardSize) + x;
    }

    public bool ValidateShipPlacement(List<ShipState> ships)
    {
        bool[] isOccupied = new bool[BoardSize * BoardSize];
        if (this.HasInvalidFleetComposition(ships)) return false;

        for (int i = 0; i < ships.Count; i++)
        {
            ShipState ship = ships[i];
            if (this.IsOutsideBoard(ship)) return false;

            bool isHorizontal = ship.Orientation == ShipOrientation.Horizontal;
            int x = ship.StartCoordinate.X;
            int y = ship.StartCoordinate.Y;

            // Check for overlapping ships
            int size = GetShipSize(ship.Name);
            for (int j = 0; j < size; j++)
            {
                int index = isHorizontal ? this.GetIndex(x + j, y) : this.GetIndex(x, y + j);
                if (isOccupied[index]) return false;
                isOccupied[index] = true;
            }
        }
        return true;
    }

    public void ProcessShipPlacement(int playerNumber, List<ShipState> ships)
    {

    }

    public void ProcessShot(int playerNumber, Coordinate coordinate)
    {

    }

    public static int GetShipSize(ShipName name) // Use this instead of trusting clients to send the correct ship size.
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


}
