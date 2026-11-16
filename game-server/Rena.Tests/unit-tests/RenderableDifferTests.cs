using Rena.Server.Rendering;

namespace Rena.Tests.Unit;

[TestFixture]
public class RenderableDifferTests
{
    [Test]
    public void GetRenderableDiff_RenderableAddition()
    {
        var oldRenderables = new List<GameRenderable>();
        var newRenderables = new List<GameRenderable>
        {
            new GameRenderable
            {
                Id = "1",
                Position = [0, 0],
                AssetPath = "/sprites/test.png",
                Size = [1, 1],
                Rotation = 0,
                Type = RenderableType.MAP,
                Layer = 0,
            },
        };
        var diff = RenderableDiffer.GetRenderableDiff(oldRenderables, newRenderables);
        Assert.That(diff, Has.Count.EqualTo(1));
        Assert.That(diff[0].Id, Is.EqualTo("1"));
        Assert.That(diff[0].Removed, Is.Null.Or.False);
    }

    private static readonly int[] Expected = [1, 1];

    [Test]
    public void GetRenderableDiff_RenderableModification()
    {
        var oldRenderables = new List<GameRenderable>
        {
            new GameRenderable
            {
                Id = "1",
                Position = [0, 0],
                AssetPath = "/sprites/test.png",
                Size = [1, 1],
                Rotation = 0,
                Type = RenderableType.MAP,
                Layer = 0,
            },
        };
        var newRenderables = new List<GameRenderable>
        {
            new GameRenderable
            {
                Id = "1",
                Position = [1, 1], // Changed position
                AssetPath = "/sprites/test.png",
                Size = [1, 1],
                Rotation = 0,
                Type = RenderableType.MAP,
                Layer = 0,
            },
        };
        var diff = RenderableDiffer.GetRenderableDiff(oldRenderables, newRenderables);
        Assert.That(diff, Has.Count.EqualTo(1));
        Assert.That(diff[0].Id, Is.EqualTo("1"));
        Assert.That(diff[0].Position, Is.EqualTo(Expected));
        Assert.That(diff[0].Removed, Is.Null.Or.False);
    }

    [Test]
    public void GetRenderableDiff_RenderableRemoval()
    {
        var oldRenderables = new List<GameRenderable>
        {
            new GameRenderable
            {
                Id = "1",
                Position = [0, 0],
                AssetPath = "/sprites/test.png",
                Size = [1, 1],
                Rotation = 0,
                Type = RenderableType.MAP,
                Layer = 0,
            },
        };
        var newRenderables = new List<GameRenderable>();
        var diff = RenderableDiffer.GetRenderableDiff(oldRenderables, newRenderables);
        Assert.That(diff, Has.Count.EqualTo(1));
        Assert.That(diff[0].Id, Is.EqualTo("1"));
        Assert.That(diff[0].Removed, Is.True);
    }
}
