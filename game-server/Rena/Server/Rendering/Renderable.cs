using System.Text.Json.Serialization;

namespace Rena.Server.Rendering;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RenderableType
{
    MAP,
    OBJECT,
    DECORATION,
}

public class GameRenderable
{
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("position")]
    public required int[] Position { get; init; } // [x,y] position of the object in the game world

    [JsonPropertyName("assetPath")]
    public required string AssetPath { get; init; }

    [JsonPropertyName("size")]
    public required int[] Size { get; init; } //how big the object is tile-wise [width, height]

    [JsonPropertyName("rotation")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Rotation { get; init; } // 0, 90, 180, 270. Clockwise. Around the position tile

    [JsonPropertyName("type")]
    public required RenderableType Type { get; init; } // (bottom, this is the game texture), objectContainer (middle), decorationContainer (top)

    [JsonPropertyName("layer")]
    public required int Layer { get; init; } //zIndex for the Z Algorithm drawing the layers (graphics)

    public override bool Equals(object? obj)
    {
        if (obj is not GameRenderable other)
        {
            return false;
        }
        // csharpier-ignore
        return (this.Id, this.Position[0], this.Position[1], this.Size[0], this.Size[1], this.Rotation, this.AssetPath, this.Layer, this.Type)
            == (other.Id, other.Position[0], other.Position[1], other.Size[0], other.Size[1], other.Rotation, other.AssetPath, other.Layer, other.Type);
    }

    public override int GetHashCode()
    {
        var hashCode = new HashCode();
        hashCode.Add(this.Id);
        hashCode.Add(this.Position[0]);
        hashCode.Add(this.Position[1]);
        hashCode.Add(this.Size[0]);
        hashCode.Add(this.Size[1]);
        hashCode.Add(this.Rotation);
        hashCode.Add(this.AssetPath);
        hashCode.Add(this.Layer);
        hashCode.Add(this.Type);
        return hashCode.ToHashCode();
    }
}

// TODO: Update to accept only changed fields, and not the entire renderable object. This will reduce the amount of data sent over the network.
public class GameRenderableDiff : GameRenderable
{
    [JsonPropertyName("removed")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Removed { get; init; } //optional, might need this for games like Battleship where elements get removed
}

public class RenderableChange
{
    [JsonPropertyName("index")]
    public required int Index { get; init; } //position of the action change (keep a sequence of changes-- helps us jump to moments backwards, forwards etc)

    [JsonPropertyName("changes")]
    public required List<GameRenderableDiff> Changes { get; init; }
}

public class ViewerSetup
{
    [JsonPropertyName("resolution")]
    public int[] Resolution { get; init; } = [920, 480];
}
