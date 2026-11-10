using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using Rena.Server.DockerManager;
using Rena.Server.GameSockets;

namespace Rena.Tests.Unit;

[TestFixture]
public class MatchMakerTests
{
    private IDockerService _dockerService;
    private MatchMaker<MockGame, GameState, GameAction> _matchMaker = null!;

    private const string ImageId = "host-bot-image-id";
    private const string CodeZipPath = "/test/host-bot.zip";
    private const string DockerfilePath = "/test/Dockerfile";

    [SetUp]
    public void BeforeEach()
    {
        _dockerService = Substitute.For<IDockerService>();

        _matchMaker = new MatchMaker<MockGame, GameState, GameAction>(
            _dockerService,
            Substitute.For<ILogger<MatchMaker<MockGame, GameState, GameAction>>>(),
            Options.Create(new RenaOptions { ServerPort = 5000 })
        );

        _dockerService
            .CreateAndStartContainerWithIdAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<LanguageExt.Option<IDictionary<string, string>>>())
            .Returns(LanguageExt.Prelude.unit);
    }

    private async Task BuildImage()
    {
        _dockerService
            .CreateOrReplaceImageAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(new LanguageExt.Common.Result<string>(ImageId));

        await _matchMaker.BuildHostBotImage(ImageId, CodeZipPath, DockerfilePath, "typescript");
    }

    [Test]
    public async Task BuildHostBotImage_CallsDockerServiceWithCorrectArguments()
    {
        _dockerService
            .CreateOrReplaceImageAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(new LanguageExt.Common.Result<string>(ImageId));

        await _matchMaker.BuildHostBotImage(ImageId, CodeZipPath, DockerfilePath, "typescript");

        await _dockerService
            .Received(1)
            .CreateOrReplaceImageAsync(Arg.Is(ImageId), Arg.Is(CodeZipPath), Arg.Is(DockerfilePath), Arg.Is("typescript"));
    }

    [Test]
    public void BuildHostBotImage_WhenDockerFails_ThrowsException()
    {
        var exception = new Exception("Failed to build Docker image");

        _dockerService
            .CreateOrReplaceImageAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(new LanguageExt.Common.Result<string>(exception));

        Assert.ThrowsAsync<Exception>(async () => await _matchMaker.BuildHostBotImage(ImageId, CodeZipPath, DockerfilePath, "typescript"));
    }

    [Test]
    public async Task GetTestRoom_NewPlayer_CreatesRoom()
    {
        await this.BuildImage();

        var room = await _matchMaker.GetTestRoom("player-1", 2);

        Assert.That(room, Is.Not.Null);
        Assert.That(room.IsStarted, Is.False);
    }

    [Test]
    public async Task GetTestRoom_ExistingPlayer_ReturnsSameRoom()
    {
        await this.BuildImage();

        var firstRoom = await _matchMaker.GetTestRoom("player-1", 2);

        var secondRoom = await _matchMaker.GetTestRoom("player-1", 2);

        Assert.That(secondRoom, Is.SameAs(firstRoom));

        await _dockerService
            .Received(1)
            .CreateAndStartContainerWithIdAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<LanguageExt.Option<IDictionary<string, string>>>());
    }

    [Test]
    public async Task GetTestRoom_DifferentPlayers_CreatesDifferentRooms()
    {
        await this.BuildImage();

        var room1 = await _matchMaker.GetTestRoom("player-1", 2);
        var room2 = await _matchMaker.GetTestRoom("player-2", 2);

        Assert.That(room1, Is.Not.SameAs(room2));

        await _dockerService
            .Received(2)
            .CreateAndStartContainerWithIdAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<LanguageExt.Option<IDictionary<string, string>>>());
    }

    [TestCase(1, 0)]
    [TestCase(2, 1)]
    [TestCase(3, 2)]
    [TestCase(4, 3)]
    public async Task GetTestRoom_CreatesCorrectNumberOfBots(int numPlayers, int expectedBotCount)
    {
        await this.BuildImage();

        await _matchMaker.GetTestRoom("player-1", numPlayers);

        await _dockerService
            .Received(expectedBotCount)
            .CreateAndStartContainerWithIdAsync(Arg.Any<string>(), Arg.Is(ImageId), Arg.Any<LanguageExt.Option<IDictionary<string, string>>>());
    }

    [Test]
    public async Task GetTestRoom_CreatesBotWithCorrectEnvironmentVariables()
    {
        await this.BuildImage();

        await _matchMaker.GetTestRoom("player-1", 2);
        Guid throwAway = new();
        _ = await _dockerService
            .Received(1)
            .CreateAndStartContainerWithIdAsync(
                Arg.Is<string>(id => Guid.TryParseExact(id, "N", out throwAway)),
                Arg.Is(ImageId),
                Arg.Is<LanguageExt.Option<IDictionary<string, string>>>(env =>
                    env.IfNone(() => new Dictionary<string, string>()).ContainsKey("URL")
                    && env.IfNone(() => new Dictionary<string, string>())["URL"].StartsWith("http://host.docker.internal:5000/game/connect/test/")
                )
            );
    }

    [Test]
    public async Task GetTestRoom_WhenContainerCreationFails_ThrowsException()
    {
        await this.BuildImage();

        var exception = new Exception("Failed to create container");

        _dockerService
            .CreateAndStartContainerWithIdAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<LanguageExt.Option<IDictionary<string, string>>>())
            .Returns(Task.FromResult(new LanguageExt.Common.Result<LanguageExt.Unit>(exception)));

        Assert.ThrowsAsync<Exception>(async () => await _matchMaker.GetTestRoom("player-1", 2));
    }
}
