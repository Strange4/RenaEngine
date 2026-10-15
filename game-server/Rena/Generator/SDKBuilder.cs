using Rena;
using Rena.GameEngine;
using Rena.Generator;

internal class SDKBuilder<G, S, A>
where G : IGame<S, A>, new()
where S : class
where A : class
{
    public static async Task BuildAll(RenaOptions options)
    {
        ILanguageSDKGenerator[] generators = [
            new TypescriptSDKGenerator(options.TSProtoPath),
        ];
        foreach (ILanguageSDKGenerator generator in generators)
        {
            string zipName = Path.GetFullPath(Path.Combine(options.GenerationDirectory, generator.LanguageName + ".zip"));
            await SDKGenerator<S, A>.GenerateSDK(options.GenerationDirectory, zipName, generator);
        }
    }

    public static List<string> AvailableLanguageGenerators()
    {
        return [TypescriptSDKGenerator.TLanguageName];
    }
}
