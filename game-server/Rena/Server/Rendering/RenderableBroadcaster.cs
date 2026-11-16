using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;

namespace Rena.Server.Rendering;

// <summary>Watches the renderables being produced every update in a game</summary>
internal interface IRenderableWatcher
{
    // <summary>Tells the renderable watcher which renderables are available after an update.</summary>
    public void SetCurrentRenderables(List<GameRenderable> renderables);
}

internal class RenderableBroadcaster : IRenderableWatcher
{
    private readonly ConcurrentDictionary<Channel<RenderableChange>, byte> _subscribers = new();
    private readonly List<RenderableChange> _history = [];
    private List<GameRenderable> _lastRenderables = [];
    private readonly Lock _lock = new();
    private int _lastChangeindex = 0;

    public void SetCurrentRenderables(List<GameRenderable> renderables)
    {
        lock (_lock)
        {
            List<GameRenderableDiff> diff = RenderableDiffer.GetRenderableDiff(_lastRenderables, renderables);
            if (diff.Count == 0)
            {
                return;
            }
            _lastChangeindex++;
            RenderableChange change = new() { Index = _lastChangeindex, Changes = diff };
            _lastRenderables = renderables;
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
