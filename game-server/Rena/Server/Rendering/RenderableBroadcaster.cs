using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Rena.Server.Rendering;

public class RenderableBroadcaster
{
    private readonly ConcurrentDictionary<Channel<RenderableChange>, byte> _subscribers = new();
    private readonly List<RenderableChange> _history = [];
    private List<GameRenderable> _lastRenderables = [];
    private readonly Lock _lock = new();
    private int _index = 0;

    public void BroadcastChange(List<GameRenderable> changes)
    {
        lock (_lock)
        {
            List<GameRenderable> diff = RenderableDiffer.GetRenderableDiff(_lastRenderables, changes);
            if (diff.Count == 0)
            {
                return;
            }
            _index++;
            RenderableChange change = new() { Index = _index, Changes = diff };
            _lastRenderables = changes;
            _history.Add(change);

            foreach (Channel<RenderableChange> subscriber in _subscribers.Keys)
            {
                subscriber.Writer.TryWrite(change);
            }
        }
    }

    public Channel<RenderableChange> Connect()
    {
        Channel<RenderableChange> channel = Channel.CreateUnbounded<RenderableChange>();
        lock (_lock)
        {
            foreach (RenderableChange change in _history)
            {
                channel.Writer.TryWrite(change);
            }

            _subscribers.TryAdd(channel, 0);
        }

        return channel;
    }

    public void Disconnect(Channel<RenderableChange> channel)
    {
        _subscribers.TryRemove(channel, out _);
        channel.Writer.TryComplete();
    }
}
