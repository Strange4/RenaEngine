using System.Text.Json.Serialization;

namespace Rena.Server.Rendering;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RenderableType
{
    MAP,
    OBJECT,
    DECORATION
}

public class GameRenderable
{
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("position")]
    public required int[] Position { get; init; }  // [x,y] position of the object in the game world

    [JsonPropertyName("assetPath")]
    public required string AssetPath { get; init; }

    [JsonPropertyName("size")]
    public required int[] Size { get; init; }  //how big the object is tile-wise [width, height]

    [JsonPropertyName("type")]
    public required RenderableType Type { get; init; } // (bottom, this is the game texture), objectContainer (middle), decorationContainer (top)

    [JsonPropertyName("layer")]
    public required int Layer { get; init; }  //zIndex for the Z Algorithm drawing the layers (graphics)

    [JsonPropertyName("removed")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Removed { get; init; } //optional, might need this for games like Battleship where elements get removed
}

public class RenderableChange
{
    [JsonPropertyName("index")]
    public required int Index { get; init; }  //position of the action change (keep a sequence of changes-- helps us jump to moments backwards, forwards etc)

    [JsonPropertyName("changes")]
    public required List<GameRenderable> Changes { get; init; }
}

public class ViewerSetup
{
    [JsonPropertyName("tileSize")]
    public int TileSize { get; init; } = 40;

    [JsonPropertyName("resolution")]
    public int[] Resolution { get; init; } = [920, 480];
}

