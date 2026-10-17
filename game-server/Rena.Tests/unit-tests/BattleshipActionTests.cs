using BattleshipServer.Logic;
using BattleshipServer.Game.Models;

namespace Rena.Tests.unit_tests;

[TestFixture]
public class BattleshipActionTests
{
    private GameLogic _gameLogic;
    private List<ShipState> _validFleet1;
    private List<ShipState> _validFleet2;

    [SetUp]
    public void Setup()
    {
        _gameLogic = new GameLogic();
        _validFleet1 = new List<ShipState>
        {
            new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate{X = 1, Y = 1}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Battleship, StartCoordinate = new Coordinate{X = 1, Y = 0}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Cruiser, StartCoordinate = new Coordinate{X = 5, Y = 0}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Submarine, StartCoordinate = new Coordinate{X = 3, Y = 2}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Destroyer, StartCoordinate = new Coordinate{X = 4, Y = 3}, Orientation = ShipOrientation.Horizontal }
        };
        _validFleet2 = new List<ShipState>
        {
            new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate{X = 0, Y = 0}, Orientation = ShipOrientation.Vertical },
            new ShipState { Name = ShipName.Battleship, StartCoordinate = new Coordinate{X = 1, Y = 0}, Orientation = ShipOrientation.Vertical },
            new ShipState { Name = ShipName.Cruiser, StartCoordinate = new Coordinate{X = 2, Y = 0}, Orientation = ShipOrientation.Vertical },
            new ShipState { Name = ShipName.Submarine, StartCoordinate = new Coordinate{X = 3, Y = 0}, Orientation = ShipOrientation.Vertical },
            new ShipState { Name = ShipName.Destroyer, StartCoordinate = new Coordinate{X = 4, Y = 0}, Orientation = ShipOrientation.Vertical }
        };
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
    public void TestInvalidActionSequence()
    {
        ActionExecutionResult result = _gameLogic.ProcessAction(1, new Coordinate { X = 0, Y = 0 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.Success));
        result = _gameLogic.ProcessAction(1, new Coordinate { X = 1, Y = 0 });
        Assert.That(result.Status, Is.EqualTo(ActionStatus.NotYourTurn));
    }

    [Test]
    public void TestValidActionSequence_WinCondition()
    {
        ActionExecutionResult? result = null;
        for (int i = 0; i < 99; i++)
        {
            result = _gameLogic.ProcessAction(1, new Coordinate { X = i % 10, Y = i / 10 });
            if (result.IsWin) break;
            result = _gameLogic.ProcessAction(2, new Coordinate { X = i % 10, Y = i / 10 });
            if (result.IsWin) break;
        }
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

}
