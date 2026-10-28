namespace Rena.Server;

using Microsoft.Extensions.Options;

internal sealed class CompetitionSettingsState
{
    private readonly Lock _lock = new();
    private readonly Dictionary<string, bool> _features;

    public CompetitionSettingsState(IOptions<RenaOptions> options)
    {
        this._features = new Dictionary<string, bool>(options.Value.Features, StringComparer.OrdinalIgnoreCase);
    }

    public bool TryGetFeature(string featureKey, out bool enabled)
    {
        lock (this._lock)
        {
            return this._features.TryGetValue(featureKey, out enabled);
        }
    }

    public bool TrySetFeature(string featureKey, bool enabled)
    {
        lock (this._lock)
        {
            if (!this._features.ContainsKey(featureKey))
            {
                return false;
            }

            this._features[featureKey] = enabled;
            return true;
        }
    }
}

internal record FeatureSettingResponse(bool Enabled);

internal record UpdateFeatureSettingRequest(bool? Enabled);
