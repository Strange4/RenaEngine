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
    public required string FilesArchivePath { get; init; }
    public required string Language { get; init; }
    public IDictionary<string, string> BuildArgs { get; init; } = new Dictionary<string, string>(); // Used during image construction
}

public interface IDockerBuildContext : IAsyncDisposable
{
    string ContentPath { get; }
}

public interface IDockerBuildContextStrategy
{
    Task<Result<IDockerBuildContext>> CreateAsync(DockerImageBuildRequest request, CancellationToken cancellationToken = default);

    string LanguageName { get; }
}

public sealed class TemporaryFileDockerBuildContext : IDockerBuildContext
{
    private readonly string _tempDir;

    public string ContentPath { get; }

    public TemporaryFileDockerBuildContext(string contentPath, string tempDir)
    {
        this.ContentPath = contentPath;
        _tempDir = tempDir;
    }

    public ValueTask DisposeAsync()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
        return ValueTask.CompletedTask;
    }
}

public sealed class TypeScriptDockerBuildContextStrategy : IDockerBuildContextStrategy
{
    private const long MaxTotalUncompressedSize = 10L * 1024 * 1024; // 10 MB
    private const int MaxEntryCount = 10_000;

    public string LanguageName => TypescriptSDKGenerator.LanguageName;

    private static string ValidateEntryPath(string entryName, string contextDir)
    {
        var normalized = entryName.Replace('\\', '/');
        if (
            string.IsNullOrWhiteSpace(normalized)
            || normalized.StartsWith('/')
            || normalized.Contains(':')
            || normalized.Split('/').Any(segment => segment is "." or "..")
        )
        {
            throw new InvalidDataException($"Invalid Zip entry path: {entryName}");
        }

        var fullContextDir = Path.GetFullPath(contextDir);
        var destinationPath = Path.GetFullPath(Path.Combine(fullContextDir, normalized.Replace('/', Path.DirectorySeparatorChar)));
        var contextPrefix = Path.EndsInDirectorySeparator(fullContextDir) ? fullContextDir : fullContextDir + Path.DirectorySeparatorChar;
        var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        if (!destinationPath.StartsWith(contextPrefix, comparison))
            throw new InvalidDataException($"Invalid Zip entry path: {entryName}");

        return destinationPath;
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
            await using var archiveStream = new FileStream(
                request.FilesArchivePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                81920,
                FileOptions.Asynchronous | FileOptions.SequentialScan
            );
            using var zip = new ZipArchive(archiveStream, ZipArchiveMode.Read, leaveOpen: true);
            int bufferSize = 81920;
            long totalUncompressedSize = 0;
            int entryCount = 0;
            foreach (var entry in zip.Entries)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (++entryCount > MaxEntryCount)
                    throw new InvalidDataException($"Zip archive exceeds the {MaxEntryCount} entry limit.");

                if (entry.Length > MaxTotalUncompressedSize - totalUncompressedSize)
                    throw new InvalidDataException($"Zip archive exceeds the {MaxTotalUncompressedSize}-byte uncompressed size limit.");
                totalUncompressedSize += entry.Length;

                var destinationPath = ValidateEntryPath(entry.FullName, contextDir);
                if (entry.FullName.EndsWith('/') || entry.FullName.EndsWith('\\'))
                {
                    Directory.CreateDirectory(destinationPath);
                    continue;
                }
                var parent = Path.GetDirectoryName(destinationPath);
                if (parent != null)
                    Directory.CreateDirectory(parent);
                await using var source = await entry.OpenAsync(cancellationToken);
                await using var target = new FileStream(
                    destinationPath,
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

            return new TemporaryFileDockerBuildContext(tarPath, tempDir);
        }
        catch
        {
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, recursive: true);
            throw;
        }
    }
}
