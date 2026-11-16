using Rena.GameEngine;
using Rena.Generator;

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
            return;
        }

        SDKBuilder.BuildAll<G, S, A>(options).Wait();
        Environment.Exit(0);
    }
}
