using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Rena.GameEngine;
using Rena.Generator;

namespace Rena.Server;

internal partial class RenaServerHandlers<G, S, A>
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

    public static async Task<IResult> HandleUpload(string playerId, IFormFile file, IOptions<RenaOptions> options)
    {
        if (!PlayerIdRegex().IsMatch(playerId))
        {
            return Results.BadRequest("The player id is in a bad format");
        }
        if (file.Length > options.Value.MaxZipFileSizeBytes)
        {
            return Results.StatusCode(413);
        }

        List<string> allowedContentTypes = ["application/zip", "application/x-zip", "application/octet-stream", "application/x-zip-compressed"];

        if (!allowedContentTypes.Contains(file.ContentType) || !file.FileName.EndsWith(".zip"))
        {
            return Results.StatusCode(415);
        }

        // Creates if not exist
        Directory.CreateDirectory(options.Value.UploadsDirectory);
        string fileName = Path.Combine(options.Value.UploadsDirectory, playerId + ".zip");
        using (FileStream fileStream = new(fileName, FileMode.Create, FileAccess.ReadWrite))
        {
            await file.CopyToAsync(fileStream);
        }
        // TODO (147) : build a docker image in the background

        return Results.Accepted();
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

    [GeneratedRegex(@"PLAYER-\d+")]
    private static partial Regex PlayerIdRegex();
}
