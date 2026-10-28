using System.IO.Compression;
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
            TSProtoPath = "../../../../Rena/generated/typescript/sdk-tools/node_modules/.bin/" + tsProtoName,
        };
        ILanguageSDKGenerator typescriptGenerator = new TypescriptSDKGenerator(options.TSProtoPath);
        string zipFilePath = Path.Combine(options.GenerationDirectory, "typescript.zip");
        await SDKGenerator<GameState, GameAction>.GenerateSDK(
            options.GenerationDirectory,
            zipFilePath,
            typescriptGenerator
        );
        Assert.That(zipFilePath, Does.Exist);
        ZipArchive archive = await ZipFile.OpenReadAsync(zipFilePath);
        var generatedTypesEntry = archive.GetEntry("generated/game.ts");
        List<ZipArchiveEntry?> wantedFiles =
        [
            generatedTypesEntry,
            archive.GetEntry("README.md"),
            archive.GetEntry("main.ts"),
            archive.GetEntry("package.json"),
            archive.GetEntry("package-lock.json"),
            archive.GetEntry("generated/gameTypes.ts"),
            archive.GetEntry("generated/glue.ts"),
        ];

        foreach (ZipArchiveEntry? entry in wantedFiles)
        {
            Assert.That(entry, Is.Not.Null);
        }

        Stream gameTypesFile = await generatedTypesEntry!.OpenAsync();
        string gameTypesFileContents = (await new StreamReader(gameTypesFile).ReadToEndAsync()).Replace("\r\n", "\n");
        // Make sure that the types I specified got generated
        string wantedActionType = @"export interface GameAction {
  Y: number;
}".Replace("\r\n", "\n");
        string wantedStateType = @"export interface GameState {
  X: number;
}".Replace("\r\n", "\n");
        Assert.That(gameTypesFileContents, Contains.Substring(wantedActionType));
        Assert.That(gameTypesFileContents, Contains.Substring(wantedStateType));
    }
}
