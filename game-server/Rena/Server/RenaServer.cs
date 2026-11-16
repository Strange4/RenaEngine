using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Rena.GameEngine;
using Rena.Server.GameSockets;

namespace Rena.Server;

public class RenaServer<G, S, A>
    where G : IGame<S, A>, new()
    where S : class
    where A : class
{
    private readonly WebApplication _app;

    private RenaServer(WebApplication app)
    {
        _app = app;
    }

    public static async Task<RenaServer<G, S, A>> Create(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var options = builder.SetRenaServices<G, S, A>();

        RenaCLI.UseRenaCLI<G, S, A>(args, options);

        var app = builder.Build();

        using (var scope = app.Services.CreateScope())
        {
            // TODO (#164) see if we have the docker in docker setup done
            var matchMaker = scope.ServiceProvider.GetRequiredService<IMatchMaker<G, S, A>>();
            await matchMaker.BuildHostBotImage("host-bot-image-id", options.HostBotZipPath, options.HostBotDockerfile, "typescript");
        }

        app.UseWebSockets();

        app.UseRenaEndpoints<G, S, A>();

        return new RenaServer<G, S, A>(app);
    }

    public void Start()
    {
        _app.Run();
    }
}
