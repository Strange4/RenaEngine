namespace Rena.Server.Rendering;

public class RenderableDiffer
{
    public static List<GameRenderableDiff> GetRenderableDiff(List<GameRenderable> oldRenderables, List<GameRenderable> newRenderables)
    {
        var diff = new List<GameRenderableDiff>();
        var oldDict = oldRenderables.ToDictionary(r => r.Id);
        var newDict = newRenderables.ToDictionary(r => r.Id);

        foreach (var (key, value) in newDict)
        {
            // If the renderable is new or has changed, add it to the diff
            if (!oldDict.TryGetValue(key, out var oldRenderable) || !oldRenderable.Equals(value))
            {
                diff.Add(
                    new GameRenderableDiff
                    {
                        Id = key,
                        Position = value.Position,
                        AssetPath = value.AssetPath,
                        Size = value.Size,
                        Rotation = value.Rotation,
                        Type = value.Type,
                        Layer = value.Layer,
                    }
                );
            }
        }

        foreach (var (key, value) in oldDict)
        {
            // If the renderable has been removed, set Removed to true and add it to the diff
            if (!newDict.ContainsKey(key))
            {
                diff.Add(
                    new GameRenderableDiff
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
}
