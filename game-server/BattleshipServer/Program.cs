using BattleshipServer.Game;
using BattleshipServer.Game.Models;
using Rena.Server;

var server = RenaServer<BattleshipGame, PlayerState, PlayerAction>.Create(args);
server.Start();
