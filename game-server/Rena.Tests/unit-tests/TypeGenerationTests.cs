using System.Runtime.Serialization;
using Rena.GameEngine;
using Rena.Generator;

namespace Rena.Tests.Unit;

public class GRPCGenerationTests
{
    [Test]
    public void CanGenerateGRPCServer()
    {
        string wantedProto =
            @"syntax = ""proto3"";

message GameAction {
   int32 Y = 1;
}
message GameState {
   int32 X = 1;
}
message SchemaContainer_GameState_GameAction {
   GameState _s = 1;
   GameAction _a = 2;
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

[DataContract]
public class GameState
{
    [DataMember(Order = 1)]
    public int X;
}

[DataContract]
public class GameAction
{
    [DataMember(Order = 1)]
    public int Y;
}

public class TestGame : IGame<GameState, GameAction>
{
    public string GetName()
    {
        return "Example game";
    }
}
