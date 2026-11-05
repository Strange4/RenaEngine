using Rena.GameEngine;

namespace Rena.Generator;

internal class SDKBuilder
{
    public static async Task BuildAll<G, S, A>(RenaOptions options)
        where G : IGame<S, A>, new()
        where S : class
        where A : class
    {
        ILanguageSDKGenerator[] generators = [new TypescriptSDKGenerator(options.TSProtoPath)];
        foreach (ILanguageSDKGenerator generator in generators)
        {
            string zipName = Path.GetFullPath(Path.Combine(options.GenerationDirectory, generator.LanguageName + ".zip"));
            await SDKGenerator<S, A>.GenerateSDK(options.GenerationDirectory, zipName, generator);
        }
    }

    public static IReadOnlyList<string> AvailableLanguageGenerators()
    {
        return [TypescriptSDKGenerator.LanguageName];
    }
}
