using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Rena.Server.Rendering;

public class RenderableBroadcaster
{
    private readonly ConcurrentDictionary<Channel<RenderableChange>, byte> _subscribers = new();
    private int _index = 0;

    public void BroadcastChange(List<GameRenderable> changes)
    {
        RenderableChange change = new()
        {
            Index = Interlocked.Increment(ref _index),
            Changes = changes
        };

        foreach (Channel<RenderableChange> subscriber in _subscribers.Keys)
        {
            subscriber.Writer.TryWrite(change);
        }
    }

    public Channel<RenderableChange> Connect()
    {
        Channel<RenderableChange> channel = Channel.CreateUnbounded<RenderableChange>();
        _subscribers.TryAdd(channel, 0);
        return channel;
    }

    public void Disconnect(Channel<RenderableChange> channel)
    {
        _subscribers.TryRemove(channel, out _);
        channel.Writer.TryComplete();
    }

}
