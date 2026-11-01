using System.Formats.Tar;
using System.IO.Compression;
using LanguageExt;
using LanguageExt.Common;
using Rena.Generator;

namespace Rena.Server.DockerManager;

public sealed class DockerImageBuildRequest
{
    public required string ImageName { get; init; }
    public required string Dockerfile { get; init; }
    public required Stream FilesArchive { get; init; }
    public required string Language { get; init; }
    public IDictionary<string, string> BuildArgs { get; init; } = new Dictionary<string, string>(); // Used during image construction
    public IDictionary<string, string> EnvVars { get; init; } = new Dictionary<string, string>(); // Available when container runs
}

public interface IDockerBuildContext : IAsyncDisposable
{
    Stream Content { get; }
}

public interface IDockerBuildContextStrategy
{
    Task<Result<IDockerBuildContext>> CreateAsync(DockerImageBuildRequest request, CancellationToken cancellationToken = default);

    string LanguageName { get; }
}

public sealed class TemporaryFileDockerBuildContext : IDockerBuildContext
{
    private readonly string _tarPath;
    private readonly string _tempDir;

    public Stream Content { get; }

    public TemporaryFileDockerBuildContext(Stream content, string tarPath, string tempDir)
    {
        this.Content = content;
        _tarPath = tarPath;
        _tempDir = tempDir;
    }

    public async ValueTask DisposeAsync()
    {
        await this.Content.DisposeAsync();
        if (File.Exists(_tarPath))
            File.Delete(_tarPath);
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }
}

public sealed class TypeScriptDockerBuildContextStrategy : IDockerBuildContextStrategy
{
    public string LanguageName => TypescriptSDKGenerator.LanguageName;

    private static string ValidateEntryPath(string entryName)
    {
        var normalized = entryName.Replace('\\', '/');
        if (
            string.IsNullOrWhiteSpace(normalized)
            || normalized.StartsWith('/')
            || normalized.Contains(':')
            || normalized.Split('/').Any(segment => segment.Contains(".."))
        )
        {
            throw new InvalidDataException($"Invalid Zip entry path: {entryName}");
        }
        return normalized;
    }

    // Building temp dir so that TAR headers know the size of the file. The point is to offload work to ROM IO instead of RAM
    public async Task<Result<IDockerBuildContext>> CreateAsync(DockerImageBuildRequest request, CancellationToken cancellationToken = default)
    {
        // Temp Dir Setup
        var id = Guid.NewGuid().ToString("N"); // 32 digits format
        var tempDir = Path.Combine(Path.GetTempPath(), $"docker-build-{id}");
        var contextDir = Path.Combine(tempDir, "context");
        var tarPath = Path.Combine(tempDir, "code.tar");
        Directory.CreateDirectory(contextDir);

        try
        {
            // Extract ZIP into context dir
            using var zip = new ZipArchive(request.FilesArchive, ZipArchiveMode.Read, leaveOpen: true);
            int bufferSize = 81920;
            foreach (var entry in zip.Entries)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var relativePath = ValidateEntryPath(entry.FullName);
                var dest = Path.Combine(contextDir, relativePath.Replace('/', Path.DirectorySeparatorChar));
                if (entry.FullName.EndsWith('/'))
                {
                    Directory.CreateDirectory(dest);
                    continue;
                }
                var parent = Path.GetDirectoryName(dest);
                if (parent != null)
                    Directory.CreateDirectory(parent);
                await using var source = await entry.OpenAsync(cancellationToken);
                await using var target = new FileStream(
                    dest,
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.None,
                    bufferSize,
                    FileOptions.Asynchronous | FileOptions.SequentialScan
                );
                await source.CopyToAsync(target, bufferSize, cancellationToken);
            }

            // Create Dockerfile
            var dockerfilePath = Path.Combine(contextDir, "Dockerfile");
            await File.WriteAllTextAsync(dockerfilePath, request.Dockerfile, cancellationToken);

            // Generate TAR inside temp dir
            await using (
                var tarStream = new FileStream(
                    tarPath,
                    FileMode.CreateNew,
                    FileAccess.ReadWrite,
                    FileShare.None,
                    bufferSize,
                    FileOptions.Asynchronous | FileOptions.SequentialScan
                )
            )
            {
                using var tarWriter = new TarWriter(tarStream, TarEntryFormat.Pax, leaveOpen: true);

                foreach (var file in Directory.EnumerateFiles(contextDir, "*", SearchOption.AllDirectories))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    var relativePath = Path.GetRelativePath(contextDir, file).Replace('\\', '/');

                    await tarWriter.WriteEntryAsync(file, relativePath, cancellationToken);
                }

                await tarStream.FlushAsync(cancellationToken);
            }

            // Open TAR Stream (not sure we want to keep this, function caller should maybe decide)
            var content = new FileStream(
                tarPath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize,
                FileOptions.Asynchronous | FileOptions.SequentialScan
            );

            return new TemporaryFileDockerBuildContext(content, tarPath, tempDir);
        }
        catch
        {
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, recursive: true);
            throw;
        }
    }
}
