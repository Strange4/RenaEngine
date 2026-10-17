using BattleshipServer.Game.Models;

namespace BattleshipServer.Logic;

public class GameLogic
{
    public const int BoardSize = 10;
    // The game state is stored in memory for simplicity.
    public List<ShipState> PlacedShips1 { get; } = new List<ShipState>();
    public List<ShipState> PlacedShips2 { get; } = new List<ShipState>();
    public List<ShotRecord> ShotsFired1 { get; } = new List<ShotRecord>();
    public List<ShotRecord> ShotsFired2 { get; } = new List<ShotRecord>();
    public bool IsPlayer1Turn { get; private set; } = true;
    public bool IsGameOver { get; private set; } = false;
    public bool IsPlayer1Winner { get; private set; } = false;

    public PlacementResult IsOutsideBoard(ShipState ship)
    {
        if (ship?.StartCoordinate == null) return PlacementResult.NullCoordinate;
        int size = GetShipSize(ship.Name);
        if (size <= 0) return PlacementResult.OutOfBounds;
        if (ship.StartCoordinate.X < 0) return PlacementResult.OutOfBounds;
        if (ship.StartCoordinate.Y < 0) return PlacementResult.OutOfBounds;
        if (ship.Orientation == ShipOrientation.ShipOrientationUnknown) return PlacementResult.UnknownOrientation;

        // Convention: Horizontal ships are placed from left to right, vertical ships are placed from top to bottom
        if (ship.Orientation == ShipOrientation.Horizontal)
        {
            if (ship.StartCoordinate.X + size > BoardSize) return PlacementResult.OutOfBounds;
            if (ship.StartCoordinate.Y >= BoardSize) return PlacementResult.OutOfBounds;
        }
        else if (ship.Orientation == ShipOrientation.Vertical)
        {
            if (ship.StartCoordinate.X >= BoardSize) return PlacementResult.OutOfBounds;
            if (ship.StartCoordinate.Y + size > BoardSize) return PlacementResult.OutOfBounds;
        }
        else
        {
            return PlacementResult.UnknownOrientation; // Invalid orientation
        }
        return PlacementResult.Success;
    }

    public PlacementResult HasInvalidFleetComposition(List<ShipState> ships)
    {
        if (ships == null) return PlacementResult.NullFleet;
        if (ships.Count != 5) return PlacementResult.InvalidFleetSize;
        HashSet<ShipName> shipNames = new HashSet<ShipName>();
        foreach (var ship in ships)
        {
            if (ship == null) return PlacementResult.NullShip;
            if (!Enum.IsDefined(typeof(ShipName), ship.Name) || ship.Name == ShipName.ShipNameUnknown) return PlacementResult.UnknownName; // Invalid ship name
            if (!Enum.IsDefined(typeof(ShipOrientation), ship.Orientation) || ship.Orientation == ShipOrientation.ShipOrientationUnknown) return PlacementResult.UnknownOrientation; // Invalid orientation
            if (!shipNames.Add(ship.Name)) return PlacementResult.InvalidFleetComposition; // If there's a duplicate, Add will return false because HashSet does not allow duplicates
        }
        return PlacementResult.Success;
    }

    public int GetIndex(int x, int y)
    {
        return (y * BoardSize) + x;
    }

    public PlacementResult ValidateShipPlacement(List<ShipState> ships)
    {
        bool[] isOccupied = new bool[BoardSize * BoardSize];
        PlacementResult fleetResult = this.HasInvalidFleetComposition(ships);
        if (fleetResult != PlacementResult.Success) return fleetResult;

        for (int i = 0; i < ships.Count; i++)
        {
            ShipState ship = ships[i];
            PlacementResult result = this.IsOutsideBoard(ship);
            if (result != PlacementResult.Success) return result;

            bool isHorizontal = ship.Orientation == ShipOrientation.Horizontal;
            int x = ship.StartCoordinate.X;
            int y = ship.StartCoordinate.Y;

            // Check for overlapping ships
            int size = GetShipSize(ship.Name);
            for (int j = 0; j < size; j++)
            {
                int index = isHorizontal ? this.GetIndex(x + j, y) : this.GetIndex(x, y + j);
                if (isOccupied[index]) return PlacementResult.Overlapping;
                isOccupied[index] = true;
            }
        }
        return PlacementResult.Success;
    }

    public PlacementResult ProcessShipPlacement(int playerNumber, List<ShipState> ships)
    {
        if (playerNumber is not (1 or 2)) return PlacementResult.InvalidPlayerNumber;
        List<ShipState>? targetShips = playerNumber is 1 ? this.PlacedShips1 : this.PlacedShips2;
        if (targetShips.Count > 0) return PlacementResult.AlreadyPlaced;
        PlacementResult result = this.ValidateShipPlacement(ships);
        if (result == PlacementResult.Success) targetShips.AddRange(ships);
        return result;
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
