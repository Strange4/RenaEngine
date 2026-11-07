using BattleshipServer.Game;
using BattleshipServer.Game.Models;
using Rena.Server;
using Rena.Server.Rendering;

var server = RenaServer<BattleshipGame, PlayerState, PlayerAction>.Create(args);

BattleshipGame? game = null;
int i = 0;

// csharpier-ignore
List<Ship> validFleet1 =
[
    new Ship { Name = ShipName.Carrier,    StartCoordinate = new Coordinate { X = 1, Y = 1 }, Orientation = ShipOrientation.Horizontal, },
    new Ship { Name = ShipName.Battleship, StartCoordinate = new Coordinate { X = 1, Y = 0 }, Orientation = ShipOrientation.Horizontal, },
    new Ship { Name = ShipName.Cruiser,    StartCoordinate = new Coordinate { X = 5, Y = 0 }, Orientation = ShipOrientation.Horizontal, },
    new Ship { Name = ShipName.Submarine,  StartCoordinate = new Coordinate { X = 3, Y = 2 }, Orientation = ShipOrientation.Horizontal, },
    new Ship { Name = ShipName.Destroyer,  StartCoordinate = new Coordinate { X = 4, Y = 3 }, Orientation = ShipOrientation.Horizontal, },
];

// csharpier-ignore
List<Ship> validFleet2 =
[
    new Ship { Name = ShipName.Carrier,    StartCoordinate = new Coordinate { X = 0, Y = 0 }, Orientation = ShipOrientation.Vertical, },
    new Ship { Name = ShipName.Battleship, StartCoordinate = new Coordinate { X = 1, Y = 0 }, Orientation = ShipOrientation.Vertical, },
    new Ship { Name = ShipName.Cruiser,    StartCoordinate = new Coordinate { X = 2, Y = 0 }, Orientation = ShipOrientation.Vertical, },
    new Ship { Name = ShipName.Submarine,  StartCoordinate = new Coordinate { X = 3, Y = 0 }, Orientation = ShipOrientation.Vertical, },
    new Ship { Name = ShipName.Destroyer,  StartCoordinate = new Coordinate { X = 4, Y = 0 }, Orientation = ShipOrientation.Vertical, },
];

RenderableBroadcaster broadcaster = server._app.Services.GetRequiredService<RenderableBroadcaster>();
server._app.MapGet(
    "/test",
    (RenderableBroadcaster broadcaster) =>
    {
        if (game == null)
        {
            game = new BattleshipGame { Broadcaster = broadcaster };
            game.GetInitial(["p1", "p2"]);
            // csharpier-ignore
            game.DoAction(new Dictionary<string, PlayerAction> { { "p1", new PlaceShipsAction { Ships = validFleet1 } }, });
            // csharpier-ignore
            game.DoAction(new Dictionary<string, PlayerAction> { { "p2", new PlaceShipsAction { Ships = validFleet2 } }, });
        }
        string currentPlayerId = game.Logic.IsPlayer1Turn ? "p1" : "p2";
        var shootAction = new ShootAction
        {
            ShootAt = new Coordinate { X = i / 2 % 10, Y = i / 2 / 10 },
        };
        game.DoAction(new Dictionary<string, PlayerAction> { { currentPlayerId, shootAction } });
        i++;
    }
);

server._app.MapGet(
    "/test/reset",
    () =>
    {
        game = null;
        i = 0;
    }
);

server.Start();
