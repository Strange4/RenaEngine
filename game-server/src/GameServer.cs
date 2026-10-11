using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace game_server;

public class GameServer
{
    private readonly WebApplication _app;

    private GameServer(WebApplication app)
    {
        _app = app;
    }

    public static GameServer Create(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        ConfigureServices(builder.Services);

        var app = builder.Build();

        ConfigureEndpoints(app);

        return new GameServer(app);
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        // TODO add services 
    }

    private static void ConfigureEndpoints(WebApplication app)
    {
        app.MapGet("/", () => "Hello World!");
    }

    public void Listen(string port)
    {
        _app.Run($"http://localhost:{port}");
    }
}