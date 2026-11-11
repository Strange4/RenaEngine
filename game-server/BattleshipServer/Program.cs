using BattleshipServer.Game;
using BattleshipServer.Game.Models;
using Rena.Server;

var server = await RenaServer<BattleshipGame, PlayerState, PlayerAction>.Create(args);
server.Start();
