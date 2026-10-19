using Docker.DotNet;

namespace DockerOrchestrator;

public static class Program
{
    static async Task Main(string[] args)
    {
        Orchestrator o = new(new DockerClientConfiguration().CreateClient());
        var imageOpt = await o.GetImageById("4ee5a832ef6e");
        await imageOpt.Match(
            Some: async img =>
            {
                var c1Opt = await o.CreateContainer(img.ID, "container-1");
                var c2Opt = await o.CreateContainer(img.ID, "container-2");
                return await c1Opt.Match(
                    Some: async c1 => await c2Opt.Match(
                        Some: async c2 =>
                                {
                                    Console.WriteLine("Starting containers");
                                    await o.StartContainer(c1.ID);
                                    await o.StartContainer(c2.ID);

                                    var stop1 = Task.Run(async () =>
                                    {
                                        await Task.Delay(TimeSpan.FromSeconds(15));
                                        Console.WriteLine("Stopping container 1");
                                        return await o.StopContainer(c1.ID);
                                    });
                                    var stop2 = Task.Run(async () =>
                                    {
                                        await Task.Delay(TimeSpan.FromSeconds(30));
                                        Console.WriteLine("Stopping container 2");
                                        return await o.StopContainer(c2.ID);
                                    });
                                    var results = await Task.WhenAll(stop1, stop2);
                                    Console.WriteLine("Deleting containers");
                                    await o.DeleteContainer(c1.ID);
                                    await o.DeleteContainer(c2.ID);
                                    return results[0] && results[1];
                                },
                    None: () => Task.FromResult(false)),
                    None: () => Task.FromResult(false));
            },
                    None: () => Task.FromResult(false));
    }
}
