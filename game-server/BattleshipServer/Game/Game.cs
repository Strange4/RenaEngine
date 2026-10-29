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

        return new Dictionary<string, PlayerState> { { _player1Id, this.Logic.GetPlayerState(1) } };
    }

    public Dictionary<string, PlayerState> DoAction(Dictionary<string, PlayerAction> playerToAction)
    {
        var (playerId, action) = playerToAction.First();
        int playerNumber = (playerId == _player1Id) ? 1 : 2;

        ActionStatus status = this.Logic.ProcessPlayerAction(playerNumber, action);

        if (status == ActionStatus.Success)
        {
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

        return new Dictionary<string, PlayerState> { { nextPlayerId, this.Logic.GetPlayerState(nextPlayerNumber) } };
    }

    public List<GameRenderable> CollectRenderables(int playerNumber, PlayerAction action)
    {
        var changes = new List<GameRenderable>();
        int offsetY = 1;
        if (action is PlaceShipsAction place)
        {
            int offsetX = playerNumber == 1 ? 1 : 12; // default x-range is 0 to 22 (look at Rena/Server/Rendering/Renderable.cs for Viewer resolution)
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
                        Type = RenderableType.OBJECT,
                        Layer = 1,
                    }
                );
            }
        }
        if (action is ShootAction shoot)
        {
            int targetOffsetX = playerNumber == 1 ? 12 : 1; // notice that it is opposite of offsetX from placeship action above
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
                    Type = RenderableType.DECORATION,
                    Layer = 0,
                }
            );
        }
        return changes;
    }
}
