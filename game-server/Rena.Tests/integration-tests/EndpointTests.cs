using System.Net;
using System.Net.Http.Json;
using System.Runtime.Serialization;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;

using Rena.GameEngine;
using Rena.Server;

namespace Rena.Tests.Integration;

[TestFixture]
public class EndpointTests
{
    private WebApplication _app;
    private HttpClient _client;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        var builder = WebApplication.CreateBuilder(
            new WebApplicationOptions
            {
                EnvironmentName = "Testing",
                Args = []
            });

        builder.WebHost.UseTestServer();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>{
            {"RenaOptions:TSProtoPath", "TESTING"},
            {"RenaOptions:AdminToken", "TEST-ADMIN-TOKEN"},
            {"RenaOptions:Features:test-feature", "false"},
        });
        builder.SetRenaServices<TestGame, GameState, GameAction>();

        _app = builder.Build();

        _app.UseRenaEndpoints<TestGame, GameState, GameAction>();

        await _app.StartAsync();
        _client = _app.GetTestClient();
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        _client?.Dispose();
        if (_app is not null)
        {
            await _app.DisposeAsync();
        }
    }

    [Test]
    public async Task DefaultEndpointTest()
    {
        var response = await _client.GetAsync("/");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));

        var content = await response.Content.ReadAsStringAsync();
        Assert.That(content, Is.EqualTo("Hello World!"));
    }

    [Test]
    public async Task Name_ReturnsGameName()
    {
        using var response = await _client.GetAsync("/name");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        var name = await response.Content.ReadFromJsonAsync<string>();
        Assert.That(name, Is.EqualTo("Example game"));
    }

    [Test]
    public async Task TestFeatureSetting_AdminCanEnableAndDisableIt()
    {
        using HttpResponseMessage initialResponse = await _client.GetAsync(
            "/settings/features/test-feature");
        Assert.That(initialResponse.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        TestFeatureSettingDto? initialSetting =
            await initialResponse.Content.ReadFromJsonAsync<TestFeatureSettingDto>();
        Assert.That(initialSetting?.Enabled, Is.False);

        using HttpResponseMessage unknownFeatureResponse = await _client.GetAsync(
            "/settings/features/unknown");
        Assert.That(unknownFeatureResponse.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));

        using HttpResponseMessage missingTokenResponse = await _client.PutAsJsonAsync(
            "/settings/features/test-feature",
            new { enabled = true });
        Assert.That(missingTokenResponse.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));

        using HttpRequestMessage wrongTokenRequest = CreateSettingRequest(true, "WRONG-TOKEN");
        using HttpResponseMessage wrongTokenResponse = await _client.SendAsync(wrongTokenRequest);
        Assert.That(wrongTokenResponse.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));

        using HttpRequestMessage invalidBodyRequest = new(
            HttpMethod.Put,
            "/settings/features/test-feature")
        {
            Content = JsonContent.Create(new { enabled = "yes" })
        };
        invalidBodyRequest.Headers.Authorization = new("Bearer", "TEST-ADMIN-TOKEN");
        using HttpResponseMessage invalidBodyResponse = await _client.SendAsync(invalidBodyRequest);
        Assert.That(invalidBodyResponse.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));

        using HttpRequestMessage enableRequest = CreateSettingRequest(true, "TEST-ADMIN-TOKEN");
        using HttpResponseMessage enableResponse = await _client.SendAsync(enableRequest);
        Assert.That(enableResponse.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        TestFeatureSettingDto? enabledSetting =
            await enableResponse.Content.ReadFromJsonAsync<TestFeatureSettingDto>();
        Assert.That(enabledSetting?.Enabled, Is.True);

        using HttpResponseMessage currentResponse = await _client.GetAsync(
            "/settings/features/test-feature");
        TestFeatureSettingDto? currentSetting =
            await currentResponse.Content.ReadFromJsonAsync<TestFeatureSettingDto>();
        Assert.That(currentSetting?.Enabled, Is.True);

        using HttpRequestMessage disableRequest = CreateSettingRequest(false, "TEST-ADMIN-TOKEN");
        using HttpResponseMessage disableResponse = await _client.SendAsync(disableRequest);
        Assert.That(disableResponse.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        TestFeatureSettingDto? disabledSetting =
            await disableResponse.Content.ReadFromJsonAsync<TestFeatureSettingDto>();
        Assert.That(disabledSetting?.Enabled, Is.False);
    }

    private static HttpRequestMessage CreateSettingRequest(bool enabled, string token)
    {
        HttpRequestMessage request = new(HttpMethod.Put, "/settings/features/test-feature")
        {
            Content = JsonContent.Create(new { enabled })
        };
        request.Headers.Authorization = new("Bearer", token);
        return request;
    }
}

public record TestFeatureSettingDto(bool Enabled);


[DataContract]
public class GameState
{
    [DataMember(Order = 1)]
    public int X;
}

[DataContract]
public class GameAction
{
    [DataMember(Order = 1)]
    public int Y;
}

public class TestGame : IGame<GameState, GameAction>
{
    public string GetName()
    {
        return "Example game";
    }
}
