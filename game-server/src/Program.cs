
using game_server;

DotNetEnv.Env.Load();

string port = Environment.GetEnvironmentVariable("GAME_SERVER_PORT") ?? "3000";

var server = GameServer.Create(args);

Console.WriteLine($"Server Listening on port {port}");
server.Listen(port);
