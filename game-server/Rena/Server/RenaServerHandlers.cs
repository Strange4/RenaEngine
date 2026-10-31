using System.Security.Cryptography;
using System.Text;
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
        if (!SDKBuilder.AvailableLanguageGenerators().Contains(languageName, StringComparer.Ordinal))
        {
            return Results.NotFound($"{languageName} isn't supported as a language");
        }

        string zipName = Path.GetFullPath(Path.Combine(options.Value.GenerationDirectory, languageName + ".zip"));

        return !Path.Exists(zipName)
            ? Results.InternalServerError("Couldn't find the necessary zip file. Make sure that your game developper generated it")
            : Results.File(zipName, contentType: "application/zip");
    }

    public static IResult GetFeatureSetting(string featureKey, CompetitionSettingsState settings)
    {
        return settings.TryGetFeature(featureKey, out bool enabled) ? Results.Ok(new FeatureSettingResponse(enabled)) : Results.NotFound();
    }

    public static IResult UpdateFeatureSetting(
        string featureKey,
        UpdateFeatureSettingRequest request,
        HttpRequest httpRequest,
        CompetitionSettingsState settings,
        IOptions<RenaOptions> options
    )
    {
        string authorization = httpRequest.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(authorization))
        {
            return Results.Unauthorized();
        }

        const string bearerPrefix = "Bearer ";
        if (!authorization.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return Results.Unauthorized();
        }

        string suppliedToken = authorization[bearerPrefix.Length..];
        if (!TokensMatch(suppliedToken, options.Value.AdminToken))
        {
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        }

        if (request.Enabled is not bool enabled)
        {
            return Results.BadRequest("enabled must be a boolean");
        }

        return settings.TrySetFeature(featureKey, enabled) ? Results.Ok(new FeatureSettingResponse(enabled)) : Results.NotFound();
    }

    private static bool TokensMatch(string suppliedToken, string expectedToken)
    {
        byte[] suppliedBytes = Encoding.UTF8.GetBytes(suppliedToken);
        byte[] expectedBytes = Encoding.UTF8.GetBytes(expectedToken);
        return suppliedBytes.Length == expectedBytes.Length && CryptographicOperations.FixedTimeEquals(suppliedBytes, expectedBytes);
    }
}
