using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public class ShipState
{
    [DataMember(Order = 1)] public ShipName Name { get; init; } = ShipName.ShipNameUnknown;
    [DataMember(Order = 2)] public ShipOrientation Orientation { get; init; } = ShipOrientation.ShipOrientationUnknown;
    [DataMember(Order = 3)] public Coordinate StartCoordinate { get; init; } = new Coordinate();
    [DataMember(Order = 4)]
    public int Size
    {
        get => GetShipSize(this.Name);
    }

    private static int GetShipSize(ShipName name)
    {
        return name switch
        {
            ShipName.Carrier => 5,
            ShipName.Battleship => 4,
            ShipName.Cruiser => 3,
            ShipName.Submarine => 3,
            ShipName.Destroyer => 2,
            _ => 0
        };
    }
}
