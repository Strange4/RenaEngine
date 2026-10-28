using Microsoft.AspNetCore.Builder;

using Rena.GameEngine;

namespace Rena.Server;

public class RenaServer<G, S, A>
where G : IGame<S, A>, new()
where S : class
where A : class
{
    private readonly WebApplication _app;

    private RenaServer(WebApplication app)
    {
        _app = app;
    }

    public static RenaServer<G, S, A> Create(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var options = builder.SetRenaServices<G, S, A>();

        RenaCLI.UseRenaCLI<G, S, A>(args, options);

        var app = builder.Build();

        app.UseWebSockets();

        app.UseRenaEndpoints<G, S, A>();

        return new RenaServer<G, S, A>(app);
    }

    public void Start()
    {
        _app.Run();
    }
}
