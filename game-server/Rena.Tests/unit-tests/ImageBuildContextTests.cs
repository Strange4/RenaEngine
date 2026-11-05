using System.IO.Compression;
using Rena.Server.DockerManager;

namespace Rena.Tests.Unit;

[TestFixture]
[Category("Unit")]
public class ImageBuildContextTests
{
    [Test]
    public async Task CreateAsync_RejectsEntryOutsideContextDirectory()
    {
        string archivePath = await CreateArchiveAsync(("../outside.txt", []));
        try
        {
            var strategy = new TypeScriptDockerBuildContextStrategy();
            Assert.ThrowsAsync<InvalidDataException>(async () => await strategy.CreateAsync(CreateRequest(archivePath)));
        }
        finally
        {
            File.Delete(archivePath);
        }
    }

    [Test]
    public async Task CreateAsync_RejectsArchiveExceedingTotalUncompressedSizeLimit()
    {
        string archivePath = await CreateArchiveAsync(("first.txt", new byte[6 * 1024 * 1024]), ("second.txt", new byte[6 * 1024 * 1024]));
        try
        {
            var strategy = new TypeScriptDockerBuildContextStrategy();
            Assert.ThrowsAsync<InvalidDataException>(async () => await strategy.CreateAsync(CreateRequest(archivePath)));
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
