using Docker.DotNet;

using LanguageExt;

namespace DockerOrchestrator;

public class Program
{
    static async Task Main(string[] args)
    {
        Orchestrator orchestrator = new(new DockerClientConfiguration().CreateClient());
        var allContainers = await orchestrator.GetStoppedContainers();
        var targetContainer = allContainers.FirstOrDefault(c =>
            c.Names != null && c.Names.Any(name => name.Contains("test", StringComparison.OrdinalIgnoreCase)));
        if (targetContainer == null)
        {
            Console.WriteLine("No container found with a name containing 'test'.");
            return;
        }
        string containerId = targetContainer.ID;
        Console.WriteLine($"Found container: {containerId} ({string.Join(", ", targetContainer.Names)})");
        Console.WriteLine("Starting container...");
        bool started = await orchestrator.StartContainer(containerId);
        if (!started)
        {
            Console.WriteLine("Failed to start the container.");
            return;
        }
        Console.WriteLine("Container started successfully.");
        Console.WriteLine("Waiting for 5 seconds...");
        await Task.Delay(TimeSpan.FromSeconds(30));
        Console.WriteLine("Stopping container...");
        bool stopped = await orchestrator.StopContainer(containerId);
        if (stopped)
        {
            Console.WriteLine("Container stopped successfully.");
        }
        else
        {
            Console.WriteLine("Failed to stop the container.");
        }
    }
}