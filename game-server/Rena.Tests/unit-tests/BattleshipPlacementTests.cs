using BattleshipServer.Game.Models;
using BattleshipServer.Logic;

namespace Rena.Tests.unit_tests;

[TestFixture]
public class BattleshipPlacementTests
{
    private GameLogic _gameLogic;
    private List<ShipState> _validFleet;

    [SetUp]
    public void Setup()
    {
        _gameLogic = new GameLogic();
        _validFleet = new List<ShipState>
        {
            new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate{X = 1, Y = 1}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Battleship, StartCoordinate = new Coordinate{X = 1, Y = 0}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Cruiser, StartCoordinate = new Coordinate{X = 5, Y = 0}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Submarine, StartCoordinate = new Coordinate{X = 3, Y = 2}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Destroyer, StartCoordinate = new Coordinate{X = 4, Y = 3}, Orientation = ShipOrientation.Horizontal }
        };
    }

    [TearDown]
    public void TearDown()
    {
        _gameLogic = null!;
        _validFleet = null!;
    }

    [Test]
    public void TestValidShipPlacement()
    {
        PlacementResult result = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(result, Is.EqualTo(PlacementResult.Success));
        Assert.That(_gameLogic.PlacedShips1, Is.EqualTo(_validFleet));
        Assert.That(_gameLogic.PlacedShips2, Is.Empty);
    }

    [Test]
    public void TestInvalidShipPlacement_Overlap()
    {
        // This will overlap with the Battleship
        _validFleet[2] = new ShipState { Name = ShipName.Cruiser, StartCoordinate = new Coordinate { X = 4, Y = 0 }, Orientation = ShipOrientation.Horizontal };
        PlacementResult result = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(result, Is.EqualTo(PlacementResult.Overlapping));
    }

    [Test]
    public void TestInvalidShipPlacement_OutOfBounds()
    {
        // X = 7 is within bounds, but X = 8 is out of bounds for a ship of size 3
        _validFleet[2] = new ShipState { Name = ShipName.Cruiser, StartCoordinate = new Coordinate { X = 8, Y = 0 }, Orientation = ShipOrientation.Horizontal };
        PlacementResult result = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(result, Is.EqualTo(PlacementResult.OutOfBounds));
    }

    [Test]
    public void TestInvalidShipPlacement_InvalidFleetComposition()
    {
        // Extra Destroyer
        _validFleet[3] = new ShipState { Name = ShipName.Destroyer, StartCoordinate = new Coordinate { X = 5, Y = 3 }, Orientation = ShipOrientation.Horizontal };
        PlacementResult result = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(result, Is.EqualTo(PlacementResult.InvalidFleetComposition));
    }

    [Test]
    public void TestInvalidShipPlacement_InvalidFleetSize()
    {
        // Test with 6 ships (1 extra ship)
        _validFleet.Add(new ShipState { Name = ShipName.Destroyer, StartCoordinate = new Coordinate { X = 5, Y = 3 }, Orientation = ShipOrientation.Horizontal });
        PlacementResult resultAbove = _gameLogic.ProcessShipPlacement(1, _validFleet);
        // Remove one ship to have only 4 ships
        _validFleet.RemoveAt(0);
        _validFleet.RemoveAt(0);
        PlacementResult resultBelow = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultAbove, Is.EqualTo(PlacementResult.InvalidFleetSize));
        Assert.That(resultBelow, Is.EqualTo(PlacementResult.InvalidFleetSize));
    }

    [Test]
    public void TestInvalidShipPlacement_InvalidPlayerNumber()
    {
        // Test invalid player numbers
        PlacementResult resultNegativePlayerNumber = _gameLogic.ProcessShipPlacement(-1, _validFleet);
        PlacementResult resultZeroPlayerNumber = _gameLogic.ProcessShipPlacement(0, _validFleet);
        PlacementResult resultPlayerNumberThree = _gameLogic.ProcessShipPlacement(3, _validFleet);
        Assert.That(resultNegativePlayerNumber, Is.EqualTo(PlacementResult.InvalidPlayerNumber));
        Assert.That(resultZeroPlayerNumber, Is.EqualTo(PlacementResult.InvalidPlayerNumber));
        Assert.That(resultPlayerNumberThree, Is.EqualTo(PlacementResult.InvalidPlayerNumber));
    }

    [Test]
    public void TestInvalidShipPlacement_DuplicatePlacement()
    {
        // Attempt to place ships again for the same player
        PlacementResult firstPlacementResult = _gameLogic.ProcessShipPlacement(1, _validFleet);
        PlacementResult secondPlacementResult = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(firstPlacementResult, Is.EqualTo(PlacementResult.Success));
        Assert.That(secondPlacementResult, Is.EqualTo(PlacementResult.AlreadyPlaced));
    }

    [Test]
    public void TestValidShipPlacement_PlayerTwo()
    {
        PlacementResult resultPlayerTwoPlacement = _gameLogic.ProcessShipPlacement(2, _validFleet);
        Assert.That(resultPlayerTwoPlacement, Is.EqualTo(PlacementResult.Success));
    }

    [Test]
    public void TestInvalidShipPlacement_PlayerTwoOverlap()
    {
        // Overlaps with Carrier
        _validFleet[1] = new ShipState { Name = ShipName.Battleship, StartCoordinate = new Coordinate { X = 1, Y = 1 }, Orientation = ShipOrientation.Vertical };
        PlacementResult resultPlayerTwoPlacementOverlap = _gameLogic.ProcessShipPlacement(2, _validFleet);
        Assert.That(resultPlayerTwoPlacementOverlap, Is.EqualTo(PlacementResult.Overlapping));
    }

    [Test]
    public void TestInvalidShipPlacement_PlayerTwoOutOfBounds()
    {
        // Out of bounds
        _validFleet[2] = new ShipState { Name = ShipName.Cruiser, StartCoordinate = new Coordinate { X = 4, Y = 8 }, Orientation = ShipOrientation.Vertical };
        PlacementResult resultPlayerTwoPlacementOutOfBounds = _gameLogic.ProcessShipPlacement(2, _validFleet);
        Assert.That(resultPlayerTwoPlacementOutOfBounds, Is.EqualTo(PlacementResult.OutOfBounds));
    }

    [Test]
    public void TestInvalidShipPlacement_PlayerTwoDuplicatePlacement()
    {
        // Attempt to place ships again for player two
        PlacementResult firstPlacementResultPlayerTwo = _gameLogic.ProcessShipPlacement(2, _validFleet);
        PlacementResult secondPlacementResultPlayerTwo = _gameLogic.ProcessShipPlacement(2, _validFleet);
        Assert.That(firstPlacementResultPlayerTwo, Is.EqualTo(PlacementResult.Success));
        Assert.That(secondPlacementResultPlayerTwo, Is.EqualTo(PlacementResult.AlreadyPlaced));
    }

    [Test]
    public void TestInvalidShipPlacement_PlayerTwoInvalidFleetComposition()
    {
        // Extra Destroyer
        _validFleet[3] = new ShipState { Name = ShipName.Destroyer, StartCoordinate = new Coordinate { X = 9, Y = 0 }, Orientation = ShipOrientation.Vertical };
        PlacementResult resultPlayerTwoInvalidFleetComposition = _gameLogic.ProcessShipPlacement(2, _validFleet);
        Assert.That(resultPlayerTwoInvalidFleetComposition, Is.EqualTo(PlacementResult.InvalidFleetComposition));
    }

    [Test]
    public void TestValidShipPlacement_BothPlayers()
    {
        PlacementResult resultPlayerOne = _gameLogic.ProcessShipPlacement(1, _validFleet);
        PlacementResult resultPlayerTwo = _gameLogic.ProcessShipPlacement(2, _validFleet);
        Assert.That(resultPlayerOne, Is.EqualTo(PlacementResult.Success));
        Assert.That(resultPlayerTwo, Is.EqualTo(PlacementResult.Success));
        Assert.That(_gameLogic.PlacedShips1, Has.Count.EqualTo(5));
        Assert.That(_gameLogic.PlacedShips2, Has.Count.EqualTo(5));
    }

    [Test]
    public void TestInvalidShipPlacement_NegativeCoordinates()
    {
        // Negative coordinates for a ship
        _validFleet[0] = new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate { X = -1, Y = 0 }, Orientation = ShipOrientation.Horizontal };
        PlacementResult resultNegativeCoordinatesX = _gameLogic.ProcessShipPlacement(1, _validFleet);
        _validFleet[0] = new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate { X = 0, Y = -1 }, Orientation = ShipOrientation.Horizontal };
        PlacementResult resultNegativeCoordinatesY = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultNegativeCoordinatesX, Is.EqualTo(PlacementResult.OutOfBounds));
        Assert.That(resultNegativeCoordinatesY, Is.EqualTo(PlacementResult.OutOfBounds));
    }

    [Test]
    public void TestInvalidShipPlacement_PerpendicularAxisOutOfBounds()
    {
        // Test a ship that is placed such that it extends out of bounds on the perpendicular axis
        _validFleet[0] = new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate { X = 10, Y = 0 }, Orientation = ShipOrientation.Horizontal };
        PlacementResult resultHorizontalOutOfBounds = _gameLogic.ProcessShipPlacement(1, _validFleet);
        _validFleet[0] = new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate { X = 0, Y = 10 }, Orientation = ShipOrientation.Vertical };
        PlacementResult resultVerticalOutOfBounds = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultHorizontalOutOfBounds, Is.EqualTo(PlacementResult.OutOfBounds));
        Assert.That(resultVerticalOutOfBounds, Is.EqualTo(PlacementResult.OutOfBounds));
    }

    [Test]
    public void TestInvalidShipPlacement_UnknownEnums()
    {
        // Test with unknown enum values
        _validFleet[0] = new ShipState { Name = ShipName.ShipNameUnknown, StartCoordinate = new Coordinate { X = 0, Y = 0 }, Orientation = ShipOrientation.Horizontal };
        PlacementResult resultUnknownShipName = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultUnknownShipName, Is.EqualTo(PlacementResult.UnknownName));

        this.Setup(); // Reset the fleet to valid state for the next test
        _validFleet[0] = new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate { X = 0, Y = 0 }, Orientation = ShipOrientation.ShipOrientationUnknown };
        PlacementResult resultUnknownOrientation = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultUnknownOrientation, Is.EqualTo(PlacementResult.UnknownOrientation));
    }

    [Test]
    public void TestInvalidShipPlacement_NullFleet()
    {
        // Test with a null fleet
        PlacementResult resultNullFleet = _gameLogic.ProcessShipPlacement(1, null!);
        Assert.That(resultNullFleet, Is.EqualTo(PlacementResult.NullFleet));
    }

    [Test]
    public void TestInvalidShipPlacement_NullShipInFleet()
    {
        // Test with a null ship in the fleet
        _validFleet[0] = null!;
        PlacementResult resultNullShipInFleet = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultNullShipInFleet, Is.EqualTo(PlacementResult.NullShip));
    }

    [Test]
    public void TestInvalidShipPlacement_NullCoordinateInShip()
    {
        // Test with a null coordinate in a ship
        _validFleet[0] = new ShipState { Name = ShipName.Carrier, StartCoordinate = null!, Orientation = ShipOrientation.Horizontal };
        PlacementResult resultNullCoordinateInShip = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultNullCoordinateInShip, Is.EqualTo(PlacementResult.NullCoordinate));
    }

    [Test]
    public void TestValidShipPlacement_MaximumBoundary()
    {
        // Test placing a ship at the maximum boundary of the board
        List<ShipState> maxBoundaryFleet = new List<ShipState>
        {
            new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate{X = 5, Y = 0}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Battleship, StartCoordinate = new Coordinate{X = 0, Y = 0}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Cruiser, StartCoordinate = new Coordinate{X = 0, Y = 2}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Submarine, StartCoordinate = new Coordinate{X = 0, Y = 4}, Orientation = ShipOrientation.Horizontal },
            new ShipState { Name = ShipName.Destroyer, StartCoordinate = new Coordinate{X = 0, Y = 8}, Orientation = ShipOrientation.Vertical }
        };
        PlacementResult resultMaxBoundary = _gameLogic.ProcessShipPlacement(1, maxBoundaryFleet);
        Assert.That(resultMaxBoundary, Is.EqualTo(PlacementResult.Success));
    }

    [Test]
    public void TestInvalidShipPlacement_PerpendicularOverlap()
    {
        // Test placing ships that overlap perpendicularly
        _validFleet[0] = new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate { X = 1, Y = 1 }, Orientation = ShipOrientation.Horizontal };
        _validFleet[1] = new ShipState { Name = ShipName.Battleship, StartCoordinate = new Coordinate { X = 1, Y = 0 }, Orientation = ShipOrientation.Vertical };
        PlacementResult resultPerpendicularOverlap = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultPerpendicularOverlap, Is.EqualTo(PlacementResult.Overlapping));
    }

    [Test]
    public void TestInvalidShipPlacement_DoesNotPartiallyAddShips()
    {
        // Test that if one ship placement fails, none of the ships are added to the player's fleet
        _validFleet[0] = new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate { X = 1, Y = 1 }, Orientation = ShipOrientation.Horizontal };
        _validFleet[1] = new ShipState { Name = ShipName.Battleship, StartCoordinate = new Coordinate { X = 1, Y = 0 }, Orientation = ShipOrientation.Vertical }; // This will overlap with the Carrier
        PlacementResult resultPartialAdd = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultPartialAdd, Is.EqualTo(PlacementResult.Overlapping));
        Assert.That(_gameLogic.PlacedShips1, Is.Empty);
    }

    [Test]
    public void TestInvalidShipPlacement_InvalidCastEnum()
    {
        // Test with an invalid cast of the enum
        ShipName invalidShipName = (ShipName)999; // Invalid enum value
        ShipOrientation invalidOrientation = (ShipOrientation)999; // Invalid enum value
        _validFleet[0] = new ShipState { Name = invalidShipName, StartCoordinate = new Coordinate { X = 0, Y = 0 }, Orientation = ShipOrientation.Horizontal };
        PlacementResult resultInvalidCastEnumName = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultInvalidCastEnumName, Is.EqualTo(PlacementResult.UnknownName));
        this.Setup(); // Reset the fleet to valid state for the next test
        _validFleet[1] = new ShipState { Name = ShipName.Carrier, StartCoordinate = new Coordinate { X = 0, Y = 1 }, Orientation = invalidOrientation };
        PlacementResult resultInvalidCastEnumOrientation = _gameLogic.ProcessShipPlacement(1, _validFleet);
        Assert.That(resultInvalidCastEnumOrientation, Is.EqualTo(PlacementResult.UnknownOrientation));
    }

    [Test]
    public void TestInvalidShipPlacement_EmptyFleet()
    {
        // Test with an empty fleet
        List<ShipState> emptyFleet = new List<ShipState>();
        PlacementResult resultEmptyFleet = _gameLogic.ProcessShipPlacement(1, emptyFleet);
        Assert.That(resultEmptyFleet, Is.EqualTo(PlacementResult.InvalidFleetSize));
    }

}
