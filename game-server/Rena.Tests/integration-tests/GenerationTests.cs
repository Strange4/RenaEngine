using Rena.Generator;

namespace Rena.Tests.Integration;

[TestFixture]
public class SDKGenerationTests
{
    [Test]
    [Category("SDKGeneration")]
    public async Task TypescriptGeneratesZip()
    {
        string tsProtoName = OperatingSystem.IsWindows() ? "protoc-gen-ts_proto.cmd" : "protoc-gen-ts_proto";
        RenaOptions options = new()
        {
            GenerationDirectory = "./sdks",
            TSProtoPath = "../../../../Rena/generated/typescript/sdk-tools/node_modules/.bin/" + tsProtoName
        };
        ILanguageSDKGenerator typescriptGenerator = new TypescriptSDKGenerator(options.TSProtoPath);
        string zipFilePath = Path.Combine(options.GenerationDirectory, "typescript.zip");
        await SDKGenerator<GameState, GameAction>.GenerateSDK(options.GenerationDirectory, zipFilePath, typescriptGenerator);
        Assert.That(zipFilePath, Does.Exist);
    }
}
