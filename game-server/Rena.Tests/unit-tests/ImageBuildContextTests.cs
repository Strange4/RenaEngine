using System.IO.Compression;
using LanguageExt.Common;
using Rena.Server.DockerManager;

namespace Rena.Tests.Unit;

[TestFixture]
[Category("Unit")]
public class ImageBuildContextTests
{
    [Test]
    public async Task CreateAsync_ReturnsFailureForEntryOutsideContextDirectory()
    {
        string archivePath = await CreateArchiveAsync(("../outside.txt", []));
        try
        {
            var strategy = new TypeScriptDockerBuildContextStrategy();
            var result = await strategy.CreateAsync(CreateRequest(archivePath));
            Assert.That(result.IsFaulted, Is.True);
        }
        finally
        {
            File.Delete(archivePath);
        }
    }

    [Test]
    public async Task CreateAsync_ReturnsFailureForArchiveExceedingTotalUncompressedSizeLimit()
    {
        string archivePath = await CreateArchiveAsync(("first.txt", new byte[6 * 1024 * 1024]), ("second.txt", new byte[6 * 1024 * 1024]));
        try
        {
            var strategy = new TypeScriptDockerBuildContextStrategy();
            var result = await strategy.CreateAsync(CreateRequest(archivePath));
            Assert.That(result.IsFaulted, Is.True);
        }
        finally
        {
            File.Delete(archivePath);
        }
    }

    [Test]
    public async Task CreateAsync_ReturnsFailureForArchiveExceedingEntryCountLimit()
    {
        string archivePath = await CreateArchiveAsync(
            Enumerable.Range(0, 10_001).Select(index => ($"file-{index}.txt", Array.Empty<byte>())).ToArray()
        );
        try
        {
            var strategy = new TypeScriptDockerBuildContextStrategy();
            var result = await strategy.CreateAsync(CreateRequest(archivePath));
            Assert.That(result.IsFaulted, Is.True);
        }
        finally
        {
            File.Delete(archivePath);
        }
    }

    [Test]
    public async Task CreateAsync_ReturnsFailureWhenCancellationIsRequested()
    {
        string archivePath = await CreateArchiveAsync(("file.txt", []));
        try
        {
            var strategy = new TypeScriptDockerBuildContextStrategy();
            var result = await strategy.CreateAsync(CreateRequest(archivePath), new CancellationToken(canceled: true));
            Assert.That(result.IsFaulted, Is.True);
        }
        finally
        {
            File.Delete(archivePath);
        }
    }

    private static DockerImageBuildRequest CreateRequest(string archivePath) =>
        new()
        {
            ImageName = "test-image",
            Dockerfile = "FROM scratch",
            FilesArchivePath = archivePath,
            Language = "TypeScript",
        };

    private static async Task<string> CreateArchiveAsync(params (string EntryName, byte[] Contents)[] entries)
    {
        string archivePath = Path.Combine(Path.GetTempPath(), $"docker-build-context-{Guid.NewGuid():N}.zip");
        using (var archive = await ZipFile.OpenAsync(archivePath, ZipArchiveMode.Create))
        {
            foreach (var (entryName, contents) in entries)
            {
                var entry = archive.CreateEntry(entryName, CompressionLevel.Fastest);
                using var entryStream = await entry.OpenAsync();
                await entryStream.WriteAsync(contents);
            }
        }

        return archivePath;
    }
}
