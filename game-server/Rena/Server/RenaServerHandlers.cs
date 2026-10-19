using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

using Rena.GameEngine;
using Rena.Generator;

namespace Rena.Server;

internal class RenaServerHandlers<G, S, A>
where G : IGame<S, A>, new()
where S : class
where A : class
{
    public static async Task<IResult> GetGameName()
    {
        return Results.Ok(new G().GetName());
    }

    public static async Task<IResult> HandleDownloads(string languageName, IOptions<RenaOptions> options)
    {
        if (!SDKBuilder<G, S, A>.AvailableLanguageGenerators().Contains(languageName))
        {
            return Results.NotFound($"{languageName} isn't supported as a language");
        }

        string zipName = Path.GetFullPath(Path.Combine(options.Value.GenerationDirectory, languageName + ".zip"));

        return !Path.Exists(zipName)
            ? Results.InternalServerError("Couldn't find the necessary zip file. Make sure that your game developper generated it")
            : Results.File(zipName, contentType: "application/zip");
    }
}
