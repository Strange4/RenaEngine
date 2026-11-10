namespace Rena.Server.Rendering;

public class RenderableDiffer
{
    public static List<GameRenderable> GetRenderableDiff(List<GameRenderable> oldRenderables, List<GameRenderable> newRenderables)
    {
        var diff = new List<GameRenderable>();
        var oldDict = oldRenderables.ToDictionary(r => r.Id);
        var newDict = newRenderables.ToDictionary(r => r.Id);

        foreach (var (key, value) in newDict)
        {
            // If the renderable is new or has changed, add it to the diff
            if (!oldDict.TryGetValue(key, out var oldRenderable) || HasChanged(oldRenderable, value))
            {
                diff.Add(value);
            }
        }

        foreach (var (key, value) in oldDict)
        {
            // If the renderable has been removed, set Removed to true and add it to the diff
            if (!newDict.ContainsKey(key))
            {
                diff.Add(
                    new GameRenderable
                    {
                        Id = key,
                        Position = value.Position,
                        AssetPath = value.AssetPath,
                        Size = value.Size,
                        Rotation = value.Rotation,
                        Type = value.Type,
                        Layer = value.Layer,
                        Removed = true,
                    }
                );
            }
        }

        return diff;
    }

    private static bool HasChanged(GameRenderable a, GameRenderable b) =>
        (a.Position[0], a.Position[1], a.Size[0], a.Size[1], a.Rotation, a.AssetPath, a.Layer)
        != (b.Position[0], b.Position[1], b.Size[0], b.Size[1], b.Rotation, b.AssetPath, b.Layer);
}
