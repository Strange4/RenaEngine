using BattleshipServer.Game.Logic;
using BattleshipServer.Game.Models;

namespace BattleshipServer.Tests.Unit;

[TestFixture]
public class BattleshipActionTests
{
    private GameLogic _gameLogic;
    private List<Ship> _validFleet1;
    private List<Ship> _validFleet2;

    [SetUp]
    public void Setup()
    {
        _gameLogic = new GameLogic();
        _validFleet1 =
        [
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
        ];
        _validFleet2 =
        [
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
        ];
        _gameLogic.ProcessShipPlacement(1, _validFleet1);
        _gameLogic.ProcessShipPlacement(2, _validFleet2);
    }

    [TearDown]
    public void TearDown()
    {
        _gameLogic = null!;
        _validFleet1 = null!;
        _validFleet2 = null!;
    }

    [Test]
    public void TestValidActionSequence()
    {
        ActionExecutionResult result = _gameLogic.ProcessAction(1, new Coordinate { X = 0, Y = 0 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.Success));
        Assert.That(result.ShotResult, Is.EqualTo(ShotResult.Hit));
        Assert.That(result.IsWin, Is.False);
    }

    [Test]
    public void TestInvalidActionSequence_ShootTwiceInARow()
    {
        ActionExecutionResult result = _gameLogic.ProcessAction(1, new Coordinate { X = 0, Y = 0 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.Success));
        result = _gameLogic.ProcessAction(1, new Coordinate { X = 1, Y = 0 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.NotYourTurn));
    }

    [Test]
    public void TestValidActionSequence_WinCondition()
    {
        ActionExecutionResult result = null!;
        for (int i = 0; i < 99; i++)
        {
            result = _gameLogic.ProcessAction(1, new Coordinate { X = i % 10, Y = i / 10 });
            if (result.IsWin)
                break;
            result = _gameLogic.ProcessAction(2, new Coordinate { X = i % 10, Y = i / 10 });
            if (result.IsWin)
                break;
        }
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Status, Is.EqualTo(ActionStatus.Success));
        Assert.That(result.ShotResult, Is.EqualTo(ShotResult.Sunk));
        Assert.That(result.IsWin, Is.True);
    }

    [Test]
    public void TestValidActionSequence_Miss()
    {
        _gameLogic.ProcessAction(1, new Coordinate { X = 0, Y = 0 });
        ActionExecutionResult result = _gameLogic.ProcessAction(2, new Coordinate { X = 0, Y = 0 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.Success));
        Assert.That(result.ShotResult, Is.EqualTo(ShotResult.Miss));
        Assert.That(result.IsWin, Is.False);
    }

    [Test]
    public void TestValidActionSequence_Sunk()
    {
        ActionExecutionResult result = null!;
        for (int i = 1; i < 5; i++) //Player 2 will sink Player 1's Battleship (4) at i = 4
        {
            result = _gameLogic.ProcessAction(1, new Coordinate { X = i % 10, Y = i / 10 });
            if (result.IsWin)
                break;
            result = _gameLogic.ProcessAction(2, new Coordinate { X = i % 10, Y = i / 10 });
            if (result.IsWin)
                break;
        }
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Status, Is.EqualTo(ActionStatus.Success));
        Assert.That(result.ShotResult, Is.EqualTo(ShotResult.Sunk));
        Assert.That(result.IsWin, Is.False);
    }

    [Test]
    public void TestInvalidActionSequence_ShootWhenNotReady()
    {
        _gameLogic = new GameLogic();
        ActionExecutionResult result = _gameLogic.ProcessAction(2, new Coordinate { X = 0, Y = 0 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.NotReadyToStart));
    }

    [Test]
    public void TestInvalidActionSequence_ShootAfterGameOver()
    {
        ActionExecutionResult result;
        for (int i = 0; i < 99; i++)
        {
            result = _gameLogic.ProcessAction(1, new Coordinate { X = i % 10, Y = i / 10 });
            if (result.IsWin)
                break;
            result = _gameLogic.ProcessAction(2, new Coordinate { X = i % 10, Y = i / 10 });
            if (result.IsWin)
                break;
        }
        result = _gameLogic.ProcessAction(1, new Coordinate { X = 9, Y = 9 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.GameOver));
    }

    [Test]
    public void TestInvalidActionSequence_NonTurnPlayerShoot()
    {
        ActionExecutionResult result = _gameLogic.ProcessAction(2, new Coordinate { X = 9, Y = 9 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.NotYourTurn));
    }

    [Test]
    public void TestInvalidActionSequence_AlreadyFired()
    {
        _gameLogic.ProcessAction(1, new Coordinate { X = 9, Y = 9 });
        _gameLogic.ProcessAction(2, new Coordinate { X = 9, Y = 9 });
        ActionExecutionResult result = _gameLogic.ProcessAction(1, new Coordinate { X = 9, Y = 9 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.AlreadyFired));
    }

    [Test]
    public void TestInvalidActionSequence_OutOfBounds()
    {
        ActionExecutionResult result = _gameLogic.ProcessAction(1, new Coordinate { X = 10, Y = 10 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.OutOfBounds));
    }

    [Test]
    public void TestValidShotsFiredHistory()
    {
        _gameLogic.ProcessAction(1, new Coordinate { X = 1, Y = 2 });
        _gameLogic.ProcessAction(2, new Coordinate { X = 3, Y = 4 });
        _gameLogic.ProcessAction(1, new Coordinate { X = 5, Y = 6 });
        _gameLogic.ProcessAction(2, new Coordinate { X = 7, Y = 8 });

        Assert.That(_gameLogic.Player1.ShotsFired[0].Coordinate.X, Is.EqualTo(1));
        Assert.That(_gameLogic.Player1.ShotsFired[0].Coordinate.Y, Is.EqualTo(2));
        Assert.That(_gameLogic.Player1.ShotsFired[0].Result, Is.EqualTo(ShotResult.Hit));

        Assert.That(_gameLogic.Player1.ShotsFired[1].Coordinate.X, Is.EqualTo(5));
        Assert.That(_gameLogic.Player1.ShotsFired[1].Coordinate.Y, Is.EqualTo(6));
        Assert.That(_gameLogic.Player1.ShotsFired[1].Result, Is.EqualTo(ShotResult.Miss));

        Assert.That(_gameLogic.Player2.ShotsFired[0].Coordinate.X, Is.EqualTo(3));
        Assert.That(_gameLogic.Player2.ShotsFired[0].Coordinate.Y, Is.EqualTo(4));
        Assert.That(_gameLogic.Player2.ShotsFired[0].Result, Is.EqualTo(ShotResult.Miss));

        Assert.That(_gameLogic.Player2.ShotsFired[1].Coordinate.X, Is.EqualTo(7));
        Assert.That(_gameLogic.Player2.ShotsFired[1].Coordinate.Y, Is.EqualTo(8));
        Assert.That(_gameLogic.Player2.ShotsFired[1].Result, Is.EqualTo(ShotResult.Miss));
    }
}
