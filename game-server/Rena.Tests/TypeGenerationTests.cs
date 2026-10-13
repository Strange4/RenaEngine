using Rena.Generator;

namespace Rena.Tests;

public class GRPCGenerationTests
{
    [Test]
    public void CanGenerateGRPCServer()
    {
        string wantedProto = @"syntax = ""proto3"";

message GameAction {
   int32 Y = 1;
}
message GameState {
   int32 X = 1;
}
message SchemaContainer_GameState_GameAction {
   GameState s = 1;
   GameAction a = 2;
}
";
        ProtoTypeInformation protoTypeInfo = SDKGenerator<GameState, GameAction>.GenerateProtoTypes();
        using (Assert.EnterMultipleScope())
        {
            Assert.That(protoTypeInfo.TextContents, Is.EqualTo(wantedProto));
            Assert.That(protoTypeInfo.ActionTypeName, Is.EqualTo("GameAction"));
            Assert.That(protoTypeInfo.StateTypeName, Is.EqualTo("GameState"));
        }
    }
}
