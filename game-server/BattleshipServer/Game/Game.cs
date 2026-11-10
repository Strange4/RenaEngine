using BattleshipServer.Game.Logic;
using BattleshipServer.Game.Models;
using Rena.GameEngine;
using Rena.Server.Rendering;

namespace BattleshipServer.Game;

public class BattleshipGame : IGame<PlayerState, PlayerAction>
{
    public GameLogic Logic { get; } = new();

    public ILogger? Logger { set; get; }

    private string _player1Id = null!; // normally getInitial is called before doAction so that it is not null
    private string _player2Id = null!;

    private readonly List<GameRenderable> _renderables = [];

    public string GetName()
    {
        return "Battleship";
    }

    public Dictionary<string, PlayerState> GetInitial(HashSet<string> playerIDs)
    {
        _player1Id = playerIDs.First();
        _player2Id = playerIDs.Last();

        _renderables.Add(
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

        // Boomerang effect: only Player 1 is returned so that Player1 knows it's his turn to start
        return new Dictionary<string, PlayerState> { { _player1Id, this.Logic.GetPlayerState(1) } };
    }

    public Dictionary<string, PlayerState> DoAction(Dictionary<string, PlayerAction> playerToAction)
    {
        var (playerId, action) = playerToAction.First();
        int playerNumber = (playerId == _player1Id) ? 1 : 2;

        this.Logger?.LogDebug("Playing turn for player: {playerNumber}", playerNumber);

        ActionStatus status = this.Logic.ProcessPlayerAction(playerNumber, action);

        if (status == ActionStatus.Success)
        {
            this.CreateRenderableFromAction(playerNumber, action);
        }
        else
        {
            this.Logger?.LogDebug("Action by {playerNumber} wasn't sucessful. Status: {status}", playerNumber, status);
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

        this.Logger?.LogDebug("Sending the new state for player: {nextPlayerNumber}", nextPlayerNumber);

        // Boomerang effect: we only return the state of the player whose turn is next.
        // That player shall complete one action and we will receive this action the next time DoAction is called.
        // By always returning the state of the next player, we will be taking turns by using a boomerang effect.
        // The boomerang effect is sending a message and expect to be called back when the message arrives.
        return new Dictionary<string, PlayerState> { { nextPlayerId, this.Logic.GetPlayerState(nextPlayerNumber) } };
    }

    private void CreateRenderableFromAction(int playerNumber, PlayerAction action)
    {
        int offsetX = playerNumber == 1 ? 1 : 12;
        int targetOffsetX = playerNumber == 1 ? 12 : 1;
        int offsetY = 1;
        if (action is PlaceShipsAction place)
        {
            for (int i = 0; i < place.Ships.Count; i++)
            {
                Ship ship = place.Ships[i];
                bool isHorizontal = ship.Orientation == ShipOrientation.Horizontal;
                this._renderables.Add(
                    new GameRenderable
                    {
                        Id = $"p{playerNumber}-ship-{i}",
                        Position = [offsetX + ship.StartCoordinate.X, offsetY + ship.StartCoordinate.Y],
                        Size = [ship.Size, 1], // Horizontal size. If vertical, the rotation will be 90 degrees automatically
                        AssetPath = "/sprites/ship1.png", // can change depending on where the asset is stored
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
            this._renderables.Add(
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
    }

    public List<GameRenderable> CollectRenderables()
    {
        return this._renderables;
    }

    public bool IsGameOver()
    {
        return this.Logic.IsGameOver;
    }
}
