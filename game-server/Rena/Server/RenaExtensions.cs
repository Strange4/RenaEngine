namespace Rena.Server;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Rena.GameEngine;

public static class RenaExtensions
{
    public static RenaOptions UseRenaOptions<G, S, A>(this WebApplicationBuilder builder)
    where G : IGame<S, A>, new()
    where S : class
    where A : class
    {
        RenaOptions renaOptions = new();
        builder.Configuration.GetSection(RenaOptions.SectionName).Bind(renaOptions);

        builder.WebHost.UseUrls($"http://*:{renaOptions.ServerPort}");

        builder.Services.AddSingleton<RenaServer<G, S, A>>();

        builder.Services.AddOptions<RenaOptions>()
            .BindConfiguration(RenaOptions.SectionName)
            .ValidateOnStart();
        return renaOptions;
    }

    public static void UseRenaServer<G, S, A>(this WebApplication app)
    where G : IGame<S, A>, new()
    where S : class
    where A : class
    {
        app.MapGet("/name", RenaServer<G, S, A>.GetGameName);
        app.MapGet("/downloads/{languageName}", RenaServer<G, S, A>.HandleDownloads);
    }
}
