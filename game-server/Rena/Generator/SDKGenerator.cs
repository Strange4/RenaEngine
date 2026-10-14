using System.Runtime.Serialization;
using System.IO.Compression;

using ProtoBuf;

namespace Rena.Generator;

internal class SDKGenerator<S, A>
where S : class
where A : class
{
    // Generates an SDK for a specific language in that language directory
    public static async Task GenerateSDK(string generationDirectory, string zipFilePath, ILanguageSDKGenerator languageSDKGenerator)
    {
        generationDirectory = Path.GetFullPath(generationDirectory);
        zipFilePath = Path.GetFullPath(zipFilePath);
        Directory.CreateDirectory(generationDirectory);

        string protoFileName = "game.proto";
        string protoFilePath = Path.Combine(generationDirectory, protoFileName);
        ProtoTypeInformation typeInfo = await SDKGenerator<S, A>.GenerateProtoFile(protoFilePath);

        string specificLanguageGenerationDirectory = Path.Combine(generationDirectory, languageSDKGenerator.LanguageName);
        Directory.CreateDirectory(specificLanguageGenerationDirectory);
        await languageSDKGenerator.GenerateSDK(typeInfo, specificLanguageGenerationDirectory, protoFilePath);

        if (File.Exists(zipFilePath))
        {
            File.Delete(zipFilePath);
        }

        await ZipFile.CreateFromDirectoryAsync(specificLanguageGenerationDirectory, zipFilePath);
    }

    private static async Task<ProtoTypeInformation> GenerateProtoFile(string protoFilePath)
    {
        ProtoTypeInformation typeInfo = SDKGenerator<S, A>.GenerateProtoTypes();
        string protoFileContents = typeInfo.TextContents;
        await File.WriteAllTextAsync(protoFilePath, protoFileContents);
        return typeInfo;
    }

    public static ProtoTypeInformation GenerateProtoTypes()
    {
        Type stateType = typeof(S);
        Type actionType = typeof(A);

        // It's dumb but to allow compile time generation of schema inference we have to
        // make a container containing both types
        string protoText = Serializer.GetProto<SchemaContainer>();
        string stateTypeName = stateType.Name;
        string actionTypeName = actionType.Name;
        return new ProtoTypeInformation { TextContents = protoText, StateTypeName = stateTypeName, ActionTypeName = actionTypeName };
    }

    [DataContract]
    private class SchemaContainer
    {
#pragma warning disable CS8618, IDE0051, CS0169
        [DataMember(Order = 1)]
        S s;
        [DataMember(Order = 2)]
        A a;
#pragma warning restore CS8618, IDE0051, CS0169
    }
}

internal interface ILanguageSDKGenerator
{
    Task GenerateSDK(ProtoTypeInformation typeInfo, string generationDirectory, string protoFilePath);
    public string LanguageName { get; }
    public static abstract string TLanguageName { get; }
}

internal struct ProtoTypeInformation
{
    public string TextContents;
    public string StateTypeName;
    public string ActionTypeName;
}
