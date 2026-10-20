using BattleshipServer.Game.Models;

namespace BattleshipServer.Game.Logic;

public class GameLogic
{
    public const int BoardSize = 10;
    public List<Ship> PlacedShips1 { get; } = new List<Ship>();
    public List<Ship> PlacedShips2 { get; } = new List<Ship>();
    public List<ShotRecord> ShotsFired1 { get; } = new List<ShotRecord>();
    public List<ShotRecord> ShotsFired2 { get; } = new List<ShotRecord>();
    public List<Ship> SunkShips1 { get; } = new List<Ship>();
    public List<Ship> SunkShips2 { get; } = new List<Ship>();
    public bool IsPlayer1Turn { get; private set; } = true;
    public bool IsGameOver { get; private set; } = false;
    public bool IsPlayer1Winner { get; private set; } = false;

    public PlacementResult IsOutsideBoard(Ship ship)
    {
        if (ship == null) return PlacementResult.NullCoordinate;
        if (ship.StartCoordinate == null) return PlacementResult.NullCoordinate;
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
            return PlacementResult.UnknownOrientation;
        }
        return PlacementResult.Success;
    }

    public PlacementResult ValidateFleetComposition(List<Ship> ships)
    {
        if (ships == null) return PlacementResult.NullFleet;
        if (ships.Count != 5) return PlacementResult.InvalidFleetSize;
        HashSet<ShipName> shipNames = new HashSet<ShipName>();
        foreach (var ship in ships)
        {
            if (ship == null)
                return PlacementResult.NullShip;
            if (ship.Name is ShipName.ShipNameUnknown || !Enum.IsDefined(ship.Name))
                return PlacementResult.UnknownName;
            if (ship.Orientation is not (ShipOrientation.Horizontal or ShipOrientation.Vertical))
                return PlacementResult.UnknownOrientation;
            if (!shipNames.Add(ship.Name))  // If there's a duplicate, HashSet.Add will return false because HashSet does not allow duplicates
                return PlacementResult.InvalidFleetComposition;
        }
        return PlacementResult.Success;
    }

    public int GetIndex(int x, int y)
    {
        return (y * BoardSize) + x;
    }

    public PlacementResult ValidateShipPlacement(List<Ship> ships)
    {
        bool[] isOccupied = new bool[BoardSize * BoardSize];
        PlacementResult fleetResult = this.ValidateFleetComposition(ships);
        if (fleetResult != PlacementResult.Success) return fleetResult;

        for (int i = 0; i < ships.Count; i++)
        {
            Ship ship = ships[i];
            PlacementResult result = this.IsOutsideBoard(ship);
            if (result != PlacementResult.Success) return result;

            bool isHorizontal = ship.Orientation == ShipOrientation.Horizontal;
            int x = ship.StartCoordinate.X;
            int y = ship.StartCoordinate.Y;

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

    public PlacementResult ProcessShipPlacement(int playerNumber, List<Ship> ships)
    {
        if (playerNumber is not (1 or 2)) return PlacementResult.InvalidPlayerNumber;
        List<Ship> targetShips = playerNumber is 1 ? this.PlacedShips1 : this.PlacedShips2;
        if (targetShips.Count > 0) return PlacementResult.AlreadyPlaced;
        PlacementResult result = this.ValidateShipPlacement(ships);
        if (result == PlacementResult.Success) targetShips.AddRange(ships);
        return result;
    }

    public ActionExecutionResult ProcessAction(int playerNumber, Coordinate coordinate)
    {
        /*
         * Check if the shot hits any of the opponent's ships
         * Check if the shot sinks any of the opponent's ships
         * Check if the shot results in a win for the player
         * Switch turns to the other player
         * Return the result of the shot (hit, miss, sunk, win, etc.)
         */

        ActionStatus status = this.ValidateAction(playerNumber, coordinate);
        if (status != ActionStatus.Success) return new(status);

        List<Ship> opponentShips = playerNumber == 1 ? this.PlacedShips2 : this.PlacedShips1;
        List<ShotRecord> shotsFired = playerNumber == 1 ? this.ShotsFired1 : this.ShotsFired2;
        List<Ship> opponentsSunkShips = playerNumber == 1 ? this.SunkShips2 : this.SunkShips1;

        Ship? hitShip = opponentShips.FirstOrDefault(ship => this.ShipOccupiesCoordinate(ship, coordinate));
        if (hitShip == null)
        {
            shotsFired.Add(new ShotRecord { Coordinate = coordinate!, Result = ShotResult.Miss });
            this.IsPlayer1Turn = !this.IsPlayer1Turn; // Switch turns
            return new(ActionStatus.Success, ShotResult.Miss);
        }

        shotsFired.Add(new ShotRecord { Coordinate = coordinate!, Result = ShotResult.Hit });
        bool isSunk = this.IsShipSunk(hitShip, shotsFired);
        if (isSunk)
        {
            shotsFired[shotsFired.Count - 1] = new ShotRecord { Coordinate = coordinate!, Result = ShotResult.Sunk }; // Update from hit to sunk
            opponentsSunkShips.Add(hitShip);
            if (this.CheckWinCondition(opponentShips, shotsFired))
            {
                this.IsGameOver = true;
                this.IsPlayer1Winner = playerNumber == 1;
                return new(ActionStatus.Success, ShotResult.Sunk, IsWin: true);
            }
        }
        this.IsPlayer1Turn = !this.IsPlayer1Turn; // Switch turns
        return new(ActionStatus.Success, isSunk ? ShotResult.Sunk : ShotResult.Hit);

    }

    private ActionStatus ValidateAction(int playerNumber, Coordinate coordinate)
    {
        /* 
         * Check if both players have placed their ships before allowing shots to be processed.
         * Check if IsGameOver
         * Check if it's the correct player's turn
         * Validate the shot coordinate is within bounds
         * Check if the shot has already been fired at that coordinate
         */
        if (this.PlacedShips1.Count == 0 || this.PlacedShips2.Count == 0) return ActionStatus.NotReadyToStart;
        if (this.IsGameOver) return ActionStatus.GameOver;
        if ((playerNumber is not (1 or 2))) return ActionStatus.InvalidPlayerNumber;
        if (this.IsPlayer1Turn && playerNumber == 2) return ActionStatus.NotYourTurn;
        if (!this.IsPlayer1Turn && playerNumber == 1) return ActionStatus.NotYourTurn;
        if (coordinate == null) return ActionStatus.NullCoordinate;
        if (coordinate.X < 0 || coordinate.X >= BoardSize || coordinate.Y < 0 || coordinate.Y >= BoardSize) return ActionStatus.OutOfBounds;
        List<ShotRecord> shotsFired = playerNumber == 1 ? this.ShotsFired1 : this.ShotsFired2;
        if (shotsFired.Any(s => s.Coordinate.X == coordinate.X && s.Coordinate.Y == coordinate.Y)) return ActionStatus.AlreadyFired;
        return ActionStatus.Success;
    }

    private bool ShipOccupiesCoordinate(Ship ship, Coordinate coordinate)
    {
        if (ship == null || coordinate == null) return false;
        int size = GetShipSize(ship.Name);
        if (size <= 0) return false;
        bool isHorizontal = ship.Orientation == ShipOrientation.Horizontal;
        int startX = ship.StartCoordinate.X;
        int startY = ship.StartCoordinate.Y;
        for (int i = 0; i < size; i++)
        {
            int x = isHorizontal ? startX + i : startX;
            int y = isHorizontal ? startY : startY + i;
            if (x == coordinate.X && y == coordinate.Y) return true;
        }
        return false;
    }

    private bool IsShipSunk(Ship ship, List<ShotRecord> shotsFired)
    {
        if (ship == null || shotsFired == null) return false;
        int size = GetShipSize(ship.Name);
        if (size <= 0) return false;
        bool isHorizontal = ship.Orientation == ShipOrientation.Horizontal;
        int startX = ship.StartCoordinate.X;
        int startY = ship.StartCoordinate.Y;
        for (int i = 0; i < size; i++)
        {
            int x = isHorizontal ? startX + i : startX;
            int y = isHorizontal ? startY : startY + i;
            if (!shotsFired.Any(s => s.Coordinate.X == x && s.Coordinate.Y == y)) return false;
        }
        return true;
    }

    private bool CheckWinCondition(List<Ship> opponentShips, List<ShotRecord> shotsFired)
    {
        if (opponentShips == null || shotsFired == null) return false;
        foreach (var ship in opponentShips)
        {
            if (!this.IsShipSunk(ship, shotsFired)) return false;
        }
        return true;
    }

    public PlayerState GetPlayerState(int playerNumber)
    {
        List<Ship> yourShips = playerNumber is 1 ? this.PlacedShips1 : this.PlacedShips2;
        List<Ship> sunkShips = playerNumber is 1 ? this.SunkShips2 : this.SunkShips1;
        List<ShotRecord> shotsFired = playerNumber == 1 ? this.ShotsFired1 : this.ShotsFired2;
        bool isYourTurn = playerNumber == 1 ? this.IsPlayer1Turn : !this.IsPlayer1Turn;
        bool isGameOver = this.IsGameOver;
        bool isWinner = playerNumber == 1 ? this.IsPlayer1Winner : !this.IsPlayer1Winner;
        bool isPlacementPhase = yourShips.Count < 5;

        return new PlayerState
        {
            GridSize = BoardSize,
            Ships = yourShips,
            SunkShips = sunkShips,
            ShotsFired = shotsFired,
            isYourTurn = isYourTurn && !isGameOver,
            isGameOver = isGameOver,
            isWinner = isWinner && isGameOver,
            isPlacementPhase = isPlacementPhase

        };
    }

    public ActionStatus ProcessPlayerAction(int playerNumber, PlayerAction action)
    {
        if (action == null) return ActionStatus.InvalidAction;
        if (action.PlaceShips != null && action.PlaceShips.Count > 0)
        {
            PlacementResult pr = this.ProcessShipPlacement(playerNumber, action.PlaceShips);
            return pr == PlacementResult.Success ? ActionStatus.Success : ActionStatus.InvalidPlacement;
        }

        if (action.ShootAt != null)
        {
            ActionExecutionResult result = this.ProcessAction(playerNumber, action.ShootAt);
            return result.Status;
        }

        return ActionStatus.InvalidAction;
    }

}
