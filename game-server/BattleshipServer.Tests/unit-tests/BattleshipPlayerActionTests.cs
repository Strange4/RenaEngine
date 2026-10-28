using BattleshipServer.Game.Logic;
using BattleshipServer.Game.Models;

namespace BattleshipServer.Tests.unit_tests;

[TestFixture]
public class BattleshipPlayerActionTests
{
    private GameLogic _gameLogic;
    private List<Ship> _validFleet1;
    private List<Ship> _validFleet2;

    [SetUp]
    public void Setup()
    {
        _gameLogic = new GameLogic();
        _validFleet1 = new List<Ship>
        {
            new Ship
            {
                Name = ShipName.Carrier,
                StartCoordinate = new Coordinate { X = 1, Y = 1 },
                Orientation = ShipOrientation.Horizontal,
            },
            new Ship
            {
                Name = ShipName.Battleship,
                StartCoordinate = new Coordinate { X = 1, Y = 0 },
                Orientation = ShipOrientation.Horizontal,
            },
            new Ship
            {
                Name = ShipName.Cruiser,
                StartCoordinate = new Coordinate { X = 5, Y = 0 },
                Orientation = ShipOrientation.Horizontal,
            },
            new Ship
            {
                Name = ShipName.Submarine,
                StartCoordinate = new Coordinate { X = 3, Y = 2 },
                Orientation = ShipOrientation.Horizontal,
            },
            new Ship
            {
                Name = ShipName.Destroyer,
                StartCoordinate = new Coordinate { X = 4, Y = 3 },
                Orientation = ShipOrientation.Horizontal,
            },
        };
        _validFleet2 = new List<Ship>
        {
            new Ship
            {
                Name = ShipName.Carrier,
                StartCoordinate = new Coordinate { X = 0, Y = 0 },
                Orientation = ShipOrientation.Vertical,
            },
            new Ship
            {
                Name = ShipName.Battleship,
                StartCoordinate = new Coordinate { X = 1, Y = 0 },
                Orientation = ShipOrientation.Vertical,
            },
            new Ship
            {
                Name = ShipName.Cruiser,
                StartCoordinate = new Coordinate { X = 2, Y = 0 },
                Orientation = ShipOrientation.Vertical,
            },
            new Ship
            {
                Name = ShipName.Submarine,
                StartCoordinate = new Coordinate { X = 3, Y = 0 },
                Orientation = ShipOrientation.Vertical,
            },
            new Ship
            {
                Name = ShipName.Destroyer,
                StartCoordinate = new Coordinate { X = 4, Y = 0 },
                Orientation = ShipOrientation.Vertical,
            },
        };
    }

    [TearDown]
    public void TearDown()
    {
        _gameLogic = null!;
        _validFleet1 = null!;
        _validFleet2 = null!;
    }

    [Test]
    public void TestValidProcessPlayerAction_PlaceShips()
    {
        PlayerAction action = new PlaceShipsAction { Ships = _validFleet1 };
        ActionStatus status = _gameLogic.ProcessPlayerAction(1, action);
        Assert.That(status, Is.EqualTo(ActionStatus.Success));
        Assert.That(_gameLogic.Player1.PlacedShips, Has.Count.EqualTo(5));
    }

    [Test]
    public void TestInvalidProcessPlayerAction_PlaceShips()
    {
        // Test with fleet size 0
        PlayerAction action = new PlaceShipsAction { Ships = new List<Ship>() };
        ActionStatus status = _gameLogic.ProcessPlayerAction(1, action);
        Assert.That(status, Is.EqualTo(ActionStatus.InvalidPlacement));
    }

    [Test]
    public void TestValidProcessPlayerAction_Shoot()
    {
        _gameLogic.ProcessShipPlacement(1, _validFleet1);
        _gameLogic.ProcessShipPlacement(2, _validFleet2);
        PlayerAction action = new ShootAction
        {
            ShootAt = new Coordinate { X = 0, Y = 0 },
        };
        ActionStatus status = _gameLogic.ProcessPlayerAction(1, action);
        Assert.That(status, Is.EqualTo(ActionStatus.Success));
    }

    [Test]
    public void TestInvalidProcessPlayerAction_ShootOutOfBounds()
    {
        _gameLogic.ProcessShipPlacement(1, _validFleet1);
        _gameLogic.ProcessShipPlacement(2, _validFleet2);
        PlayerAction action = new ShootAction
        {
            ShootAt = new Coordinate { X = 10, Y = 10 },
        };
        ActionStatus status = _gameLogic.ProcessPlayerAction(1, action);
        Assert.That(status, Is.EqualTo(ActionStatus.OutOfBounds));
    }

    [Test]
    public void TestInvalidProcessPlayerAction_NullAction()
    {
        ActionStatus status = _gameLogic.ProcessPlayerAction(1, null);
        Assert.That(status, Is.EqualTo(ActionStatus.InvalidAction));
    }

    [Test]
    public void TestValidGetPlayerState_PlacementPhase()
    {
        PlayerState state = _gameLogic.GetPlayerState(1);
        Assert.That(state.GridSize, Is.EqualTo(GameLogic.BoardSize));
        Assert.That(state.isPlacementPhase, Is.True);
        Assert.That(state.isGameOver, Is.False);
        Assert.That(state.isWinner, Is.False);
        Assert.That(state.Ships, Is.Empty);
        Assert.That(state.ShotsFired, Is.Empty);
        Assert.That(state.SunkShips, Is.Empty);
    }

    [Test]
    public void TestValidGetPlayerState_TurnsAndGamePlay()
    {
        _gameLogic.ProcessShipPlacement(1, _validFleet1);
        _gameLogic.ProcessShipPlacement(2, _validFleet2);

        PlayerState statePlayer1 = _gameLogic.GetPlayerState(1);
        PlayerState statePlayer2 = _gameLogic.GetPlayerState(2);

        Assert.That(statePlayer1.isPlacementPhase, Is.False);
        Assert.That(statePlayer2.isPlacementPhase, Is.False);
        Assert.That(statePlayer1.Ships, Has.Count.EqualTo(5));
    }

    [Test]
    public void TestValidGetPlayerState_GameOverAndWinner()
    {
        _gameLogic.ProcessShipPlacement(1, _validFleet1);
        _gameLogic.ProcessShipPlacement(2, _validFleet2);

        // Player 2 wins first in this for loop because they have a grid that has a lower y value than all of player 1's.
        for (int i = 0; i < 99; i++)
        {
            ActionExecutionResult result1 = _gameLogic.ProcessAction(1, new Coordinate { X = i % 10, Y = i / 10 });
            if (result1.IsWin)
                break;
            ActionExecutionResult result2 = _gameLogic.ProcessAction(2, new Coordinate { X = i % 10, Y = i / 10 });
            if (result2.IsWin)
                break;
        }

        PlayerState statePlayer1 = _gameLogic.GetPlayerState(1);
        PlayerState statePlayer2 = _gameLogic.GetPlayerState(2);

        Assert.That(statePlayer1.isGameOver, Is.True);
        Assert.That(statePlayer2.isGameOver, Is.True);
        Assert.That(statePlayer1.isWinner, Is.False);
        Assert.That(statePlayer2.isWinner, Is.True);
        Assert.That(statePlayer2.SunkShips, Has.Count.EqualTo(5));
    }

    [Test]
    public void TestActionExecutionResult_DefaultConstructor()
    {
        ActionExecutionResult result = new ActionExecutionResult();
        Assert.That(result.Status, Is.EqualTo(ActionStatus.UnknownAction));
        Assert.That(result.ShotResult, Is.EqualTo(ShotResult.ShotResultUnknown));
        Assert.That(result.IsWin, Is.False);
    }

    [Test]
    public void TestShip_GetShipSize_UnknownName()
    {
        //unknown name defaults to size 0
        Ship ship = new Ship { Name = (ShipName)123 };
        Assert.That(ship.Size, Is.EqualTo(0));
    }

    [Test]
    public void TestShip_IsOutsideBoard_UnknownOrientation()
    {
        Ship ship = new Ship
        {
            Name = ShipName.Carrier,
            StartCoordinate = new Coordinate { X = 0, Y = 0 },
            Orientation = ShipOrientation.ShipOrientationUnknown,
        };
        Assert.That(ship.IsOutsideBoard(10), Is.True);
    }

    [Test]
    public void TestShip_IsOutsideBoard_ZeroSize()
    {
        Ship ship = new Ship
        {
            Name = (ShipName)123, //unknown name defaults to size 0
            StartCoordinate = new Coordinate { X = 0, Y = 0 },
            Orientation = ShipOrientation.Horizontal,
        };
        Assert.That(ship.IsOutsideBoard(10), Is.True);
    }

    [Test]
    public void TestShip_IsOutsideBoard_VerticalOutOfBounds()
    {
        Ship ship = new Ship
        {
            Name = ShipName.Carrier,
            StartCoordinate = new Coordinate { X = 10, Y = 0 },
            Orientation = ShipOrientation.Vertical,
        };
        Assert.That(ship.IsOutsideBoard(10), Is.True);
    }
}
