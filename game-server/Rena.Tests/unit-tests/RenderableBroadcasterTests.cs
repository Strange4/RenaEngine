using System.Threading.Channels;
using Rena.Server.Rendering;

namespace Rena.Tests.Unit;

[TestFixture]
public class RenderableBroadcasterTests
{
    private RenderableBroadcaster _broadcaster = null!;
    private List<GameRenderable> _dummyChanges = null!;

    [SetUp]
    public void Setup()
    {
        _broadcaster = new RenderableBroadcaster();
        _dummyChanges =
        [
            new GameRenderable
            {
                Id = "test-1",
                Position = [0, 0],
                AssetPath = "/sprites/test.test",
                Size = [1, 1],
                Rotation = 0,
                Type = RenderableType.MAP,
                Layer = 0,
            },
        ];
    }

    [TearDown]
    public void TearDown()
    {
        _broadcaster = null!;
    }

    [Test]
    public void TestBroadcaster_SameChangesNotBroadcasted()
    {
        // Connect then broadcast
        Channel<RenderableChange> channel = _broadcaster.Connect();
        _broadcaster.SetCurrentRenderables(_dummyChanges);
        Assert.That(channel.Reader.TryRead(out _), Is.True);
        _broadcaster.SetCurrentRenderables(_dummyChanges);
        Assert.That(channel.Reader.TryRead(out _), Is.False);

        _broadcaster.Disconnect(channel);
    }

    [Test]
    public void TestBroadcaster_LateJoinerReceivesLastState()
    {
        // Broadcast then connect
        _broadcaster.SetCurrentRenderables(_dummyChanges);
        Channel<RenderableChange> channel = _broadcaster.Connect();
        Assert.That(channel.Reader.TryRead(out RenderableChange? change), Is.True);
        Assert.That(change, Is.Not.Null);
        Assert.That(change!.Changes, Has.Count.EqualTo(1));
        Assert.That(change.Changes[0].Id, Is.EqualTo("test-1"));

        _broadcaster.Disconnect(channel);
    }
}
