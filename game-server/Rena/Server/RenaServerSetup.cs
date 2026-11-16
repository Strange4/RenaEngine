namespace Rena.Server;

using System.ComponentModel.DataAnnotations;
using Docker.DotNet;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Rena.GameEngine;
using Rena.Server.DockerManager;
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
        builder.Services.AddSingleton<CompetitionSettingsState>();
        builder.Services.AddSingleton(sp => new DockerClientConfiguration().CreateClient());
        builder.Services.AddSingleton<IDockerService>(sp =>
        {
            // TODO #164 Make a factory for the BuildContextStrategies based on available languages
            // Only using the default one for now
            var logger = sp.GetRequiredService<ILogger<DockerService>>();
            var client = sp.GetRequiredService<DockerClient>();
            return new DockerService(client, logger);
        });
        builder.Services.AddSingleton<IMatchMaker<G, S, A>, MatchMaker<G, S, A>>();
        builder.Services.AddTransient<GameSocketHandler<G, S, A>>();
        builder.Services.AddSingleton<IGameRoomManager>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<GameRoomManager<G, S, A>>>();
            var matchmaker = sp.GetRequiredService<IMatchMaker<G, S, A>>();
            return new GameRoomManager<G, S, A>(matchmaker, renaOptions.RoomSize, logger);
        });

        builder.Services.AddOptions<RenaOptions>().BindConfiguration(RenaOptions.SectionName).ValidateOnStart();
        return renaOptions;
    }

    public static void UseRenaEndpoints<G, S, A>(this WebApplication app)
        where G : IGame<S, A>, new()
        where S : class
        where A : class
    {
        app.MapGet("/", () => "Hello World!");
        app.MapGet("/downloads/{languageName}", RenaServerHandlers.HandleDownloads);
        app.Map(
            "/game/connect/test/{playerId}",
            async (string playerId, HttpContext context, GameSocketHandler<G, S, A> handler) => await handler.GameConnect(context, playerId)
        );
        app.MapGet("/settings/features/{featureKey}", RenaServerHandlers.GetFeatureSetting);
        app.MapPut("/settings/features/{featureKey}", RenaServerHandlers.UpdateFeatureSetting);
        app.MapPost("/upload/{playerId}", RenaServerHandlers.HandleUpload).DisableAntiforgery();
        app.MapGet("/render/stream/{playerId}", RenaServerHandlers.HandleSSEConnection);
    }
}
