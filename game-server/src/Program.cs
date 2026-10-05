
DotNetEnv.Env.Load();

string port = Environment.GetEnvironmentVariable("GAME_SERVER_PORT") ?? "3000";

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls($"http://*:{port}");

var app = builder.Build();


app.MapGet("/", () => "Hello World!");

Console.WriteLine($"Server Listening on port {port}");
app.Run();
