using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace game_server.tests;

[TestFixture]
public class EndpointTests
{
    private WebApplicationFactory<Program> _factory;
    private HttpClient _client;

    [OneTimeSetUp]
    public void OneTimeSetUp()
    {
        _factory = new WebApplicationFactory<Program>();
        _client = _factory.CreateClient();
    }

    [OneTimeTearDown]
    public void OneTimeTearDown()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Test]
    public async Task DefaultEndpointTest()
    {
        var response = await _client.GetAsync("/");

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));

        var content = await response.Content.ReadAsStringAsync();
        Assert.That(content, Is.EqualTo("Hello World!"));
    }
}