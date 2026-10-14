using Rena.Server;

using Battleship_server.Game;

var server = RenaServer<BattleshipGame, PlayerState, PlayerAction>.Create(args);
server.Start();
