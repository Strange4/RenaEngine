namespace Rena.Generator;

using System.Reflection;

internal class EmbeddedFileIO
{
    public static async Task WriteAllEmbeddedFiles(string directory, string namespacedSourceDirectory, List<string> fileNames)
    {
        List<Task> tasks = [];
        foreach (string fileName in fileNames)
        {
            tasks.Add(WriteEmbededFile(directory, namespacedSourceDirectory, fileName));
        }
        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Writes a file embedded in the DLL to the file system.
    /// </summary>
    /// <exception cref="ArgumentNullException">
    /// The embedded resource could not be found.
    /// </exception>
    public static async Task WriteEmbededFile(string directory, string namespacedSourceDirectory, string sourceFileName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        using Stream? stream =
            assembly.GetManifestResourceStream("Rena." + namespacedSourceDirectory + "." + sourceFileName)
            ?? throw new ArgumentNullException(nameof(sourceFileName), "Coudldn't read the embedded file");

        StreamReader reader = new(stream);
        string text = await reader.ReadToEndAsync();

        await File.WriteAllTextAsync(Path.Combine(directory, sourceFileName), text);
    }
}
