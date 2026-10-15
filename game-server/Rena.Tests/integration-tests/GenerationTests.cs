using System.Net;
using System.Net.Http.Json;
using System.Runtime.Serialization;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;

using Rena.GameEngine;
using Rena.Server;
using Rena.Generator;

namespace Rena.Tests.Integration;

[TestFixture]
public class SDKGenerationTests
{

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
    }

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
    }
}
