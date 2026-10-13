using Rena;
using Rena.Server;
using Rena.GameEngine;
using System.Runtime.Serialization;

var builder = WebApplication.CreateBuilder(args);
var renaOptions = builder.UseRenaOptions<BattleshipGame, PlayerState, PlayerAction>();
RenaCLI.UseRenaCLI<BattleshipGame, PlayerState, PlayerAction>(args, renaOptions);

// Starting the app
var app = builder.Build();
app.UseRenaServer<BattleshipGame, PlayerState, PlayerAction>();

Console.WriteLine($"Server Listening on port {renaOptions.ServerPort}");

app.Run();

class BattleshipGame : IGame<PlayerState, PlayerAction>
{
    public string GetName()
    {
        return "Battleship";
    }
}

[DataContract]
class PlayerState
{
    [DataMember(Order = 1)]
    List<bool> Grid;

    [DataMember]
    int GridSize;
}

[DataContract]
class PlayerAction
{
    [DataMember(Order = 1)]
    int X;
    [DataMember(Order = 2)]
    int Y;
}
