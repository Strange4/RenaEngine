using Rena.GameEngine;

namespace Rena;

public class RenaCLI
{
    public static void UseRenaCLI<G, S, A>(string[] args, RenaOptions options)
    where G : IGame<S, A>, new()
    where S : class
    where A : class
    {
        if (args.Length == 0)
        {
            return;
        }
        if (args[0] != "--generate")
        {
            throw new ArgumentException("Usage: dotnet run --generate");
        }
        SDKBuilder<G, S, A>.BuildAll(options).Wait();
        Environment.Exit(0);
    }
}
