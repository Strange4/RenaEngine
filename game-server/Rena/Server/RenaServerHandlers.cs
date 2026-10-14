using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Rena.GameEngine;

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
            return Results.NotFound("That language ain't supported cuh");
        }
        string zipName = Path.GetFullPath(Path.Combine(options.Value.GenerationDirectory, languageName + ".zip"));
        return Results.File(zipName, contentType: "application/zip");
    }
}
