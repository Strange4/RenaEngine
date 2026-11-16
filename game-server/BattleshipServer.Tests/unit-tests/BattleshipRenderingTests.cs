using BattleshipServer.Game;
using BattleshipServer.Game.Models;
using Rena.Server.Rendering;

namespace BattleshipServer.Tests.Unit;

[TestFixture]
public class BattleshipRenderingTests
{
    private BattleshipGame _game = null!;
    private List<Ship> _validFleet = null!;

    [SetUp]
    public void Setup()
    {
        _game = new BattleshipGame();
        // csharpier-ignore
        _validFleet =
        [
            new Ship{Name = ShipName.Carrier,StartCoordinate = new Coordinate { X = 0, Y = 0 },Orientation = ShipOrientation.Horizontal,},
            new Ship{Name = ShipName.Battleship,StartCoordinate = new Coordinate { X = 0, Y = 1 },Orientation = ShipOrientation.Horizontal,},
            new Ship{Name = ShipName.Cruiser,StartCoordinate = new Coordinate { X = 0, Y = 2 },Orientation = ShipOrientation.Horizontal,},
            new Ship{Name = ShipName.Submarine,StartCoordinate = new Coordinate { X = 0, Y = 3 },Orientation = ShipOrientation.Horizontal,},
            new Ship{Name = ShipName.Destroyer,StartCoordinate = new Coordinate { X = 0, Y = 4 },Orientation = ShipOrientation.Vertical,},
        ];
    }

    [TearDown]
    public void TearDown()
    {
        _game = null!;
        _validFleet = null!;
    }

    [Test]
    public void TestDoAction_PlaceShips()
    {
        Dictionary<string, PlayerState> initialStates = _game.GetInitial(["p1", "p2"]);
        Assert.That(initialStates.ContainsKey("p1"), Is.True);
        Assert.That(initialStates.ContainsKey("p2"), Is.False);

        List<GameRenderable> initialRenderables = _game.GetAllRenderables();
        Assert.That(initialRenderables, Has.Count.EqualTo(1));
        Assert.That(initialRenderables[0].Type, Is.EqualTo(RenderableType.MAP));

        PlaceShipsAction action = new PlaceShipsAction { Ships = _validFleet };
        Dictionary<string, PlayerState> nextStates = _game.DoAction(new Dictionary<string, PlayerAction> { { "p1", action } });

        Assert.That(nextStates.ContainsKey("p2"), Is.True);

        List<GameRenderable> renderables = _game.GetAllRenderables();
        Assert.That(renderables, Has.Count.EqualTo(6));
        Assert.That(renderables.Skip(1), Has.All.Property(nameof(GameRenderable.Type)).EqualTo(RenderableType.OBJECT));
    }

    [Test]
    public void TestDoAction_Shoot()
    {
        _game.GetInitial(["p1", "p2"]);

        // csharpier-ignore
        _game.DoAction(new Dictionary<string, PlayerAction> { { "p1", new PlaceShipsAction { Ships = _validFleet } } });
        // csharpier-ignore
        _game.DoAction(new Dictionary<string, PlayerAction> { { "p2", new PlaceShipsAction { Ships = _validFleet } } });

        // csharpier-ignore
        ShootAction shootAction1 = new ShootAction { ShootAt = new Coordinate { X = 0, Y = 0 } };
        Dictionary<string, PlayerState> stateAfter1 = _game.DoAction(new Dictionary<string, PlayerAction> { { "p1", shootAction1 } });
        Assert.That(stateAfter1.ContainsKey("p2"), Is.True);

        GameRenderable hit = _game.GetAllRenderables()[^1];
        Assert.That(hit.Type, Is.EqualTo(RenderableType.OBJECT));
        Assert.That(hit.AssetPath, Is.EqualTo("/sprites/hit.png"));

        // csharpier-ignore
        ShootAction shootAction2 = new ShootAction { ShootAt = new Coordinate { X = 9, Y = 9 } };
        Dictionary<string, PlayerState> stateAfter2 = _game.DoAction(new Dictionary<string, PlayerAction> { { "p2", shootAction2 } });
        Assert.That(stateAfter2.ContainsKey("p1"), Is.True);
    }

    [Test]
    public void TestDoAction_InvalidAction()
    {
        _game.GetInitial(["p1", "p2"]);

        var invalidAction = new ShootAction
        {
            ShootAt = new Coordinate { X = 10, Y = 10 },
        };
        ActionStatus status = _game.Logic.ProcessPlayerAction(1, invalidAction);
        Assert.That(status, Is.Not.EqualTo(ActionStatus.Success));
        var nextStates = _game.DoAction(new Dictionary<string, PlayerAction> { { "p1", invalidAction } });
        Assert.That(nextStates.ContainsKey("p1"), Is.True); // Currently, the turn does not change if the action is invalid, so the next state is still player 1
        Assert.That(nextStates.ContainsKey("p2"), Is.False);
        Assert.That(_game.Logic.GetPlayer(1).ShotsFired, Is.Empty);
    }

    // This test is needed: if it fails, it probably means the defaults in Rendering/Renderable.cs changed,
    // which is a problem because battleship currently assumes that the default are exactly these values: 40 tilesize, [920, 480] resolution
    [Test]
    public void TestViewerSetup_DefaultValues()
    {
        ViewerSetup setup = new ViewerSetup();

        int[] expected = [920, 480];
        Assert.That(setup.Resolution, Is.EqualTo(expected));
    }

    [Test]
    public void TestViewerSetup_CustomValues()
    {
        ViewerSetup setup = new ViewerSetup { Resolution = [1024, 768] };

        int[] expected = [1024, 768];
        Assert.That(setup.Resolution, Is.EqualTo(expected));
    }
}
