using BattleshipServer.Game;

namespace BattleshipServer.Tests.unit_tests;

[TestFixture]
public class BattleshipGameTests
{
    [Test]
    public void GetName_ReturnsBattleship()
    {
        var game = new BattleshipGame();
        Assert.That(game.GetName(), Is.EqualTo("Battleship"));
    }
}
