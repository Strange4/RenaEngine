namespace Rena.Server;

using System.ComponentModel.DataAnnotations;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Rena.GameEngine;
using Rena.Server.GameSockets;

internal static class RenaServerSetup
{
    public static RenaOptions SetRenaServices<G, S, A>(this WebApplicationBuilder builder)
    where G : IGame<S, A>, new()
    where S : class
    where A : class
    {
        RenaOptions renaOptions = new();
        builder.Configuration.GetSection(RenaOptions.SectionName).Bind(renaOptions);

        Validator.ValidateObject(renaOptions, new ValidationContext(renaOptions));

        builder.WebHost.UseUrls($"http://*:{renaOptions.ServerPort}");

        builder.Services.AddConnections();

        builder.Services.AddSingleton<RenaServerHandlers<G, S, A>>();
        builder.Services.AddTransient<GameSocketHandler<G, S, A>>();

        builder.Services.AddOptions<RenaOptions>()
            .BindConfiguration(RenaOptions.SectionName)
            .ValidateOnStart();
        return renaOptions;
    }

    public static void UseRenaEndpoints<G, S, A>(this WebApplication app)
    where G : IGame<S, A>, new()
    where S : class
    where A : class
    {
        app.MapGet("/", () => "Hello World!");
        app.MapGet("/name", RenaServerHandlers<G, S, A>.GetGameName);
        app.MapGet("/downloads/{languageName}", RenaServerHandlers<G, S, A>.HandleDownloads);
        app.MapConnectionHandler<GameSocketHandler<G, S, A>>("/game/connect/{playerId}");
    }
}
