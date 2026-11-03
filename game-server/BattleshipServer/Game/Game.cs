using BattleshipServer.Game.Logic;
using BattleshipServer.Game.Models;
using Rena.GameEngine;
using Rena.Server.Rendering;

namespace BattleshipServer.Game;

public class BattleshipGame : IGame<PlayerState, PlayerAction>
{
    public GameLogic Logic { get; } = new();
    public RenderableBroadcaster? Broadcaster { get; set; }

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

        this.Broadcaster?.BroadcastChange([
            new GameRenderable
            {
                Id = "map",
                Position = [0, 0],
                AssetPath = "/sprites/map.png",
                Size = [23, 12],
                Type = RenderableType.MAP,
                Layer = 0,
            },
        ]);

        // Boomerang effect: only Player 1 is returned so that Player1 knows it's his turn to start
        return new Dictionary<string, PlayerState> { { _player1Id, this.Logic.GetPlayerState(1) } };
    }

    public Dictionary<string, PlayerState> DoAction(Dictionary<string, PlayerAction> playerToAction)
    {
        var (playerId, action) = playerToAction.First();
        int playerNumber = (playerId == _player1Id) ? 1 : 2;

        ActionStatus status = this.Logic.ProcessPlayerAction(playerNumber, action);

        if (status == ActionStatus.Success)
        {
            // TODO #137: Move renderable diffing into RenaEngine
            List<GameRenderable> changes = this.CollectRenderables(playerNumber, action);
            this.Broadcaster?.BroadcastChange(changes);
        }

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

    public List<GameRenderable> CollectRenderables(int playerNumber, PlayerAction action)
    {
        var changes = new List<GameRenderable>();
        int offsetX = playerNumber == 1 ? 1 : 12;
        int targetOffsetX = playerNumber == 1 ? 12 : 1;
        int offsetY = 1;
        if (action is PlaceShipsAction place)
        {
            for (int i = 0; i < place.Ships.Count; i++)
            {
                Ship ship = place.Ships[i];
                bool isHorizontal = ship.Orientation == ShipOrientation.Horizontal;
                changes.Add(
                    new GameRenderable
                    {
                        Id = $"p{playerNumber}-ship-{i}",
                        Position = [offsetX + ship.StartCoordinate.X, offsetY + ship.StartCoordinate.Y],
                        Size = isHorizontal ? [ship.Size, 1] : [1, ship.Size],
                        AssetPath = "sprites/ship1.png", // can change depending on where the asset is stored
                        Rotation = isHorizontal ? 0 : 90,
                        Type = RenderableType.OBJECT,
                        Layer = 1,
                    }
                );
            }
        }
        if (action is ShootAction shoot)
        {
            Player player = this.Logic.GetPlayer(playerNumber);
            ShotRecord? lastShot = player.ShotsFired.LastOrDefault();
            string sprite = (lastShot?.Result is ShotResult.Hit or ShotResult.Sunk) ? "/sprites/hit.png" : "/sprites/miss.png";
            changes.Add(
                new GameRenderable
                {
                    Id = $"shot-{playerNumber}-{shoot.ShootAt.X}-{shoot.ShootAt.Y}",
                    Position = [targetOffsetX + shoot.ShootAt.X, offsetY + shoot.ShootAt.Y],
                    Size = [1, 1],
                    AssetPath = sprite,
                    Type = RenderableType.OBJECT,
                    Layer = 2,
                }
            );
        }
        return changes;
    }
}
