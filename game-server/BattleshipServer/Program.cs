using BattleshipServer.Game;

using Rena.Server;

var server = RenaServer<BattleshipGame, PlayerState, PlayerAction>.Create(args);
server.Start();
