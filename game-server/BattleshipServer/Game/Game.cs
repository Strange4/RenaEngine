using BattleshipServer.Game.Logic;
using BattleshipServer.Game.Models;
using Rena.GameEngine;
using Rena.Server.Rendering;

namespace BattleshipServer.Game;

public class BattleshipGame : IGame<PlayerState, PlayerAction>
{
    public GameLogic Logic { get; } = new();

    private string _player1Id = null!; // normally getInitial is called before doAction so that it is not null
    private string _player2Id = null!;

    public string GetName()
    {
        return "Battleship";
    }

    public Dictionary<string, PlayerState> GetInitial(HashSet<string> playerIDs)
    {
        _player1Id = playerIDs.First();
        _player2Id = playerIDs.Last();

        // Boomerang effect: only Player 1 is returned so that Player1 knows it's his turn to start
        return new Dictionary<string, PlayerState> { { _player1Id, this.Logic.GetPlayerState(1) } };
    }

    public Dictionary<string, PlayerState> DoAction(Dictionary<string, PlayerAction> playerToAction)
    {
        var (playerId, action) = playerToAction.First();
        int playerNumber = (playerId == _player1Id) ? 1 : 2;

        this.Logic.ProcessPlayerAction(playerNumber, action);

        string nextPlayerId;
        int nextPlayerNumber;

        if (action is PlaceShipsAction)
        {
            nextPlayerNumber = (playerNumber == 1) ? 2 : 1;
            nextPlayerId = (playerNumber == 1) ? _player2Id : _player1Id;
        }
        else
        {
            nextPlayerNumber = this.Logic.IsPlayer1Turn ? 1 : 2;
            nextPlayerId = this.Logic.IsPlayer1Turn ? _player1Id : _player2Id;
        }

        // Boomerang effect: we only return the state of the player whose turn is next.
        // That player shall complete one action and we will receive this action the next time DoAction is called.
        // By always returning the state of the next player, we will be taking turns by using a boomerang effect.
        // The boomerang effect is sending a message and expect to be called back when the message arrives.
        return new Dictionary<string, PlayerState> { { nextPlayerId, this.Logic.GetPlayerState(nextPlayerNumber) } };
    }

    public List<GameRenderable> GetRenderables()
    {
        // Returns all the renderables that should be in the current frame. Renderable diffing is done in the engine side.
        List<GameRenderable> renderables = [];
        AddMapRenderable(renderables);
        this.AddPlayerShipsRenderable(renderables, 1, 1);
        this.AddPlayerShipsRenderable(renderables, 2, 12);
        this.AddPlayerShotsRenderable(renderables, 1, 12);
        this.AddPlayerShotsRenderable(renderables, 2, 1);

        return renderables;
    }

    private static void AddMapRenderable(List<GameRenderable> renderables)
    {
        renderables.Add(
            new GameRenderable
            {
                Id = "map",
                Position = [0, 0],
                AssetPath = "/sprites/map.png",
                Size = [23, 12],
                Type = RenderableType.MAP,
                Layer = 0,
            }
        );
    }

    private void AddPlayerShipsRenderable(List<GameRenderable> renderables, int playerNumber, int offsetX)
    {
        Player player = this.Logic.GetPlayer(playerNumber);
        for (int i = 0; i < player.PlacedShips.Count; i++)
        {
            Ship ship = player.PlacedShips[i];
            bool isHorizontal = ship.Orientation == ShipOrientation.Horizontal;
            renderables.Add(
                new GameRenderable
                {
                    Id = $"p{playerNumber}-ship-{i}",
                    Position = [offsetX + ship.StartCoordinate.X, 1 + ship.StartCoordinate.Y],
                    Size = [ship.Size, 1], // The same orientation as the asset. If the ship image asset is horizontal, the size is [size, 1]
                    AssetPath = "/sprites/ship1.png", // can change depending on where the asset is stored
                    Rotation = isHorizontal ? 0 : 90,
                    Type = RenderableType.OBJECT,
                    Layer = 1,
                }
            );
        }
    }

    private void AddPlayerShotsRenderable(List<GameRenderable> renderables, int playerNumber, int offsetX)
    {
        Player player = this.Logic.GetPlayer(playerNumber);
        foreach (ShotRecord shot in player.ShotsFired)
        {
            string sprite = (shot.Result != ShotResult.Miss) ? "/sprites/hit.png" : "/sprites/miss.png";
            renderables.Add(
                new GameRenderable
                {
                    Id = $"shot-{playerNumber}-{shot.Coordinate.X}-{shot.Coordinate.Y}",
                    Position = [offsetX + shot.Coordinate.X, 1 + shot.Coordinate.Y],
                    Size = [1, 1],
                    AssetPath = sprite,
                    Type = RenderableType.OBJECT,
                    Layer = 2,
                }
            );
        }
    }
}
