using System.Diagnostics;

namespace Rena.Generator;

internal class TypescriptSDKGenerator(string tsProtoPath) : ILanguageSDKGenerator
{
    public static string LanguageName => "typescript";
    string ILanguageSDKGenerator.LanguageName => LanguageName;

    // Exceptions:
    //      ProcessFailedException
    //      ArgumentNullException
    public async Task GenerateSDK(ProtoTypeInformation typeInfo, string generationDirectory, string protoFilePath)
    {
        tsProtoPath = Path.GetFullPath(tsProtoPath);
        string generatedTypesPath = Path.Combine(generationDirectory, "generated");
        Directory.CreateDirectory(generatedTypesPath);

        // protoc takes in a .proto type definition for protobuf and transforms it into a generated typescript type
        // using ts_proto. The generated typescript file outputs to generatedTypesPath.
        ProcessStartInfo typescriptArgs = new()
        {
            FileName = "protoc",
            ArgumentList = {
                $"--plugin=protoc-gen-ts_proto={tsProtoPath}",
                $"--ts_proto_out={generatedTypesPath}",
                $"--ts_proto_opt=esModuleInterop=true",
                $"--proto_path={Path.GetDirectoryName(protoFilePath)}",
                protoFilePath
            },
        };

        Process? process = Process.Start(typescriptArgs);
        ArgumentNullException.ThrowIfNull(process);
        await process.WaitForExitAsync();
        int exitCode = process.ExitCode;
        process.Close();
        if (exitCode != 0)
        {
            throw new ProcessFailedException("TS Proto generation failed");
        }
        string defaultFileName = "gameTypes.ts";
        string defaultFilePath = Path.Combine(generatedTypesPath, defaultFileName);

        await GenerateDefaultFile(typeInfo, defaultFilePath, protoFilePath);

        // Takes the files embedded at build time using Rena.csproj and writes them to real files in the file system.
        await EmbeddedFileIO.WriteEmbededFile(generatedTypesPath, "generated.typescript", "glue.ts");
        await EmbeddedFileIO.WriteAllEmbeddedFiles(generationDirectory, "generated.typescript", ["main.ts", "README.md", "package.json", "package-lock.json"]);
    }

    private static async Task GenerateDefaultFile(ProtoTypeInformation typeInfo, string defaultFilePath, string protoFilePath)
    {
        string importPath = Path.GetFileName(protoFilePath)[..^".proto".Length];
        string actionTypeName = typeInfo.ActionTypeName;
        string stateTypeName = typeInfo.StateTypeName;
        string content = $@"import {{ {actionTypeName}, {stateTypeName} }} from ""./{importPath}.ts""
export type Action = {actionTypeName};
export type State = {stateTypeName};
";
        await File.WriteAllTextAsync(defaultFilePath, content);
    }
}


public class ProcessFailedException : Exception
{
    public ProcessFailedException() { }
    public ProcessFailedException(string message) : base(message) { }
}
