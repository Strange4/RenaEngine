using BattleshipServer.Game.Models;

namespace BattleshipServer.Game.Logic;

public class Player
{
    public List<Ship> PlacedShips { get; } = new();
    public List<ShotRecord> ShotsFired { get; } = new();
    public List<Ship> SunkShips { get; } = new();
}

public class GameLogic
{
    public const int BoardSize = 10;
    public Player Player1 = new();
    public Player Player2 = new();
    public bool IsPlayer1Turn { get; private set; } = true;
    public bool IsGameOver { get; private set; } = false;
    public bool IsPlayer1Winner { get; private set; } = false;

    public ActionStatus ProcessPlayerAction(int playerNumber, PlayerAction? action)
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

    public PlayerState GetPlayerState(int playerNumber)
    {
        Player player = this.GetPlayer(playerNumber);
        Player opponent = this.GetOpponent(player);
        bool isYourTurn = playerNumber == 1 ? this.IsPlayer1Turn : !this.IsPlayer1Turn;
        bool isWinner = playerNumber == 1 ? this.IsPlayer1Winner : !this.IsPlayer1Winner;

        return new PlayerState
        {
            GridSize = BoardSize,
            Ships = player.PlacedShips,
            SunkShips = opponent.SunkShips,
            ShotsFired = player.ShotsFired,
            isYourTurn = isYourTurn && !this.IsGameOver,
            isGameOver = this.IsGameOver,
            isWinner = isWinner && this.IsGameOver,
            isPlacementPhase = player.PlacedShips.Count < 5

        };
    }

    internal Player GetPlayer(int playerNumber) => playerNumber == 1 ? this.Player1 : this.Player2;
    internal Player GetOpponent(Player player) => player == this.Player1 ? this.Player2 : this.Player1;


    internal PlacementResult ValidateFleetComposition(List<Ship> ships)
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

    internal int GetIndex(int x, int y)
    {
        return (y * BoardSize) + x;
    }

    internal PlacementResult ValidateShipPlacement(List<Ship> ships)
    {
        bool[] isOccupied = new bool[BoardSize * BoardSize];
        PlacementResult fleetResult = this.ValidateFleetComposition(ships);
        if (fleetResult != PlacementResult.Success) return fleetResult;

        foreach (Ship ship in ships)
        {
            if (ship.IsOutsideBoard(BoardSize)) return PlacementResult.OutOfBounds;

            bool isHorizontal = ship.Orientation == ShipOrientation.Horizontal;
            int x = ship.StartCoordinate.X;
            int y = ship.StartCoordinate.Y;

            int size = ship.Size;
            for (int j = 0; j < size; j++)
            {
                int index = isHorizontal ? this.GetIndex(x + j, y) : this.GetIndex(x, y + j);
                if (isOccupied[index]) return PlacementResult.Overlapping;
                isOccupied[index] = true;
            }
        }
        return PlacementResult.Success;
    }

    internal PlacementResult ProcessShipPlacement(int playerNumber, List<Ship> ships)
    {
        if (playerNumber is not (1 or 2)) return PlacementResult.InvalidPlayerNumber;
        Player player = this.GetPlayer(playerNumber);
        if (player.PlacedShips.Count > 0) return PlacementResult.AlreadyPlaced;
        PlacementResult result = this.ValidateShipPlacement(ships);
        if (result == PlacementResult.Success) player.PlacedShips.AddRange(ships);
        return result;
    }

    internal ActionExecutionResult ProcessAction(int playerNumber, Coordinate coordinate)
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

        Player player = this.GetPlayer(playerNumber);
        Player opponent = this.GetOpponent(player);

        Ship? hitShip = opponent.PlacedShips.FirstOrDefault(ship => this.ShipOccupiesCoordinate(ship, coordinate));
        if (hitShip == null)
        {
            player.ShotsFired.Add(new ShotRecord { Coordinate = coordinate!, Result = ShotResult.Miss });
            this.IsPlayer1Turn = !this.IsPlayer1Turn; // Switch turns
            return new(ActionStatus.Success, ShotResult.Miss);
        }

        player.ShotsFired.Add(new ShotRecord { Coordinate = coordinate!, Result = ShotResult.Hit });
        bool isSunk = this.IsShipSunk(hitShip, player.ShotsFired);
        if (isSunk)
        {
            player.ShotsFired[player.ShotsFired.Count - 1] = new ShotRecord { Coordinate = coordinate!, Result = ShotResult.Sunk }; // Update from hit to sunk
            opponent.SunkShips.Add(hitShip);
            if (this.CheckWinCondition(opponent.PlacedShips, player.ShotsFired))
            {
                this.IsGameOver = true;
                this.IsPlayer1Winner = playerNumber == 1;
                return new(ActionStatus.Success, ShotResult.Sunk, IsWin: true);
            }
        }
        this.IsPlayer1Turn = !this.IsPlayer1Turn; // Switch turns
        return new(ActionStatus.Success, isSunk ? ShotResult.Sunk : ShotResult.Hit);

    }

    internal ActionStatus ValidateAction(int playerNumber, Coordinate coordinate)
    {
        /* 
         * Check if both players have placed their ships before allowing shots to be processed.
         * Check if IsGameOver
         * Check if it's the correct player's turn
         * Validate the shot coordinate is within bounds
         * Check if the shot has already been fired at that coordinate
         */

        if ((playerNumber is not (1 or 2))) return ActionStatus.InvalidPlayerNumber;
        Player player = this.GetPlayer(playerNumber);
        Player opponent = this.GetOpponent(player);
        if (player.PlacedShips.Count == 0 || opponent.PlacedShips.Count == 0) return ActionStatus.NotReadyToStart;
        if (this.IsGameOver) return ActionStatus.GameOver;
        if (this.IsPlayer1Turn && playerNumber == 2) return ActionStatus.NotYourTurn;
        if (!this.IsPlayer1Turn && playerNumber == 1) return ActionStatus.NotYourTurn;
        if (coordinate == null) return ActionStatus.NullCoordinate;
        if (coordinate.X < 0 || coordinate.X >= BoardSize || coordinate.Y < 0 || coordinate.Y >= BoardSize) return ActionStatus.OutOfBounds;
        if (player.ShotsFired.Any(s => s.Coordinate.X == coordinate.X && s.Coordinate.Y == coordinate.Y)) return ActionStatus.AlreadyFired;
        return ActionStatus.Success;
    }

    internal bool ShipOccupiesCoordinate(Ship ship, Coordinate coordinate)
    {
        if (ship == null || coordinate == null) return false;
        int size = ship.Size;
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

    internal bool IsShipSunk(Ship ship, List<ShotRecord> shotsFired)
    {
        if (ship == null || shotsFired == null) return false;
        int size = ship.Size;
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

    internal bool CheckWinCondition(List<Ship> opponentShips, List<ShotRecord> shotsFired)
    {
        if (opponentShips == null || shotsFired == null) return false;
        foreach (var ship in opponentShips)
        {
            if (!this.IsShipSunk(ship, shotsFired)) return false;
        }
        return true;
    }





}
