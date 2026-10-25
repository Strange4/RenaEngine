using System.Collections.Concurrent;
using System.Formats.Tar;
using System.Text.RegularExpressions;

using Docker.DotNet;
using Docker.DotNet.Models;

using LanguageExt;

using Microsoft.Extensions.Logging;

using static LanguageExt.Prelude;

namespace Rena.Server;

public class Orchestrator(IDockerClient dockerClient, ILogger logger)
{
    readonly IDockerClient _client = dockerClient;

    async Task<Option<ContainerListResponse>> FindContainerById(string id, bool isRunning = true)
    {
        IDictionary<string, IDictionary<string, bool>> idFilter = new Dictionary<string, IDictionary<string, bool>>()
        {
            ["id"] = new Dictionary<string, bool>()
            {
                { id, true }
            }
        };
        IList<ContainerListResponse> result = await this.FindContainers(new ContainersListParameters() { Filters = idFilter, All = !isRunning });
        return result.Find(_ => _.ID == id);
    }

    public async Task<bool> StartContainer(string id, Option<ContainerStartParameters> parameters = new Option<ContainerStartParameters>())
    {
        try
        {
            Option<ContainerListResponse> container = await this.FindContainerById(id, false);
            return await container.Match(
                Some: async _ => await this._client.Containers.StartContainerAsync(id, parameters.IfNone(new ContainerStartParameters())),
                None: () => Task.FromResult(false));
        }
        catch (DockerApiException ex)
        {
            logger.LogError(ex, "Failed to start container {Id}", id);
            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Unexpected Error] {ex.Message}");
            return false;
        }
    }

    public async Task<bool> StopContainer(string id)
    {
        try
        {
            Option<ContainerListResponse> container = await this.FindContainerById(id);
            return await container.Match(
                Some: async _ => await this._client.Containers.StopContainerAsync(id, new ContainerStopParameters()),
                None: () => Task.FromResult(false)
            );
        }
        catch (DockerApiException ex)
        {
            logger.LogError(ex, "Failed to stop container {Id}", id);
            return false;
        }
    }

    public async Task<IList<ContainerListResponse>> GetStoppedContainers()
    {
        var containers = await _client.Containers.ListContainersAsync(new ContainersListParameters() { All = true });
        return [.. containers.Where(c => c.State != "running")];
    }

    public async Task<IList<ContainerListResponse>> GetRunningContainers()
    {
        return await _client.Containers.ListContainersAsync(new ContainersListParameters() { All = false });
    }

    public async Task<IList<ContainerListResponse>> FindContainers(ContainersListParameters filterParams)
    {
        return Optional(await _client.Containers.ListContainersAsync(filterParams)).IfNone([]);
    }

    public async Task<Option<ContainerListResponse>> GetContainerById(string id)
    {
        return await this.FindContainerById(id);
    }

    public async Task<Option<ContainerListResponse>> FindFirstContainer(ContainersListParameters filterParams)
    {
        return Optional((await this.FindContainers(filterParams)).FirstOrDefault());
    }

    public async Task<IList<ImagesListResponse>> GetAllImages(Option<ImagesListParameters> parameters = default)
    {
        try { return Optional(await this._client.Images.ListImagesAsync(parameters.IfNone(new ImagesListParameters()))).IfNone([]); }
        catch (DockerApiException ex)
        {
            logger.LogError(ex, "Failed to list images with parameters: {Parameters}", parameters);
            return [];
        }
    }

    async Task<Option<ImagesListResponse>> FindImageById(string id)
    {
        IList<ImagesListResponse> result = await this.GetAllImages(new ImagesListParameters());
        return result.Find(_ => _.ID == id || _.ID.Contains(id));
    }

    async Task<Option<ImagesListResponse>> FindImageByName(string name)
    {
        IDictionary<string, IDictionary<string, bool>> nameFilter = new Dictionary<string, IDictionary<string, bool>>()
        {
            ["reference"] = new Dictionary<string, bool>()
            {
                { name, true }
            }
        };
        IList<ImagesListResponse> result = await this.GetAllImages(new ImagesListParameters() { Filters = nameFilter, All = true });
        return Optional(result.FirstOrDefault());
    }

    public async Task<Option<ImagesListResponse>> GetImageById(string id)
    {
        return await this.FindImageById(id);
    }

    public async Task<Option<ImagesListResponse>> GetImageByName(string name)
    {
        return await this.FindImageByName(name);
    }

    public async Task<Option<CreateContainerResponse>> CreateContainer(string imageId, string containerName, Option<CreateContainerParameters> parameters = default)
    {
        try
        {
            var createParams = parameters.IfNone(new CreateContainerParameters());
            createParams.Image = imageId;
            createParams.Name = containerName;

            var response = await this._client.Containers.CreateContainerAsync(createParams);
            return Optional(response);
        }
        catch (DockerApiException ex)
        {
            logger.LogError(ex, "[Docker API Error] Status: {StatusCode} | Message: {Message}", ex.StatusCode, ex.Message);
            return Option<CreateContainerResponse>.None;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[Unexpected Error] {Message}", ex.Message);
            return Option<CreateContainerResponse>.None;
        }
    }

    public async Task<bool> DeleteContainer(string id, Option<ContainerRemoveParameters> parameters = default)
    {
        try
        {
            Option<ContainerListResponse> container = await this.FindContainerById(id, false);
            return await container.Match(
                Some: async _ =>
                {
                    await this._client.Containers.RemoveContainerAsync(id, parameters.IfNone(new ContainerRemoveParameters()));
                    return true;
                },
                None: () => Task.FromResult(false)
            );
        }
        catch (DockerApiException ex)
        {
            logger.LogError(ex, "Failed to delete container {Id}", id);
            return false;
        }
    }

    public async Task<bool> CreateImage(
        string dockerFilePath,
        string imageName,
        string? buildContextPath = null,
        IDictionary<string, string>? buildArgs = null)
    {
        if (dockerFilePath == null)
        {
            logger.LogError("File \"{File}\" not found", dockerFilePath);
            return false;
        }
        if (imageName == null)
        {
            logger.LogError("Supply an image name when building image.");
            return false;
        }

        string fullDockerFilePath = Path.GetFullPath(dockerFilePath);
        string contextDirectory = Path.GetFullPath(buildContextPath ?? Path.GetDirectoryName(fullDockerFilePath)!);
        string relativeDockerFilePath = Path.GetRelativePath(contextDirectory, fullDockerFilePath)
            .Replace(Path.DirectorySeparatorChar, '/');
        if (relativeDockerFilePath == ".." || relativeDockerFilePath.StartsWith("../", StringComparison.Ordinal))
        {
            logger.LogError("Dockerfile {Dockerfile} must be inside build context {Context}", dockerFilePath, contextDirectory);
            return false;
        }

        using var tarStream = new MemoryStream();
        using var writer = new TarWriter(tarStream, leaveOpen: true);
        try
        {
            await WriteBuildContextAsync(contextDirectory, writer);
            tarStream.Position = 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to archive Docker build context {Context}", contextDirectory);
            return false;
        }

        ConcurrentQueue<string> buildErrors = new();
        var progress = new SynchronousProgress<JSONMessage>(message =>
        {
            if (!string.IsNullOrEmpty(message.Stream))
            {
                logger.LogInformation(message.Stream);
            }
            else if (message.Error != null)
            {
                logger.LogError(message.Error.Message);
                buildErrors.Enqueue(message.Error.Message);
            }
            else if (!string.IsNullOrEmpty(message.Status))
            {
                logger.LogInformation($"{message.Status} {message.ProgressMessage}");
            }
        });
        var buildParams = new ImageBuildParameters
        {
            Dockerfile = relativeDockerFilePath,
            Tags = [imageName],
            BuildArgs = buildArgs
        };
        await this._client.Images.BuildImageFromDockerfileAsync(
            buildParams,
            tarStream,
            authConfigs: null,
            headers: null,
            progress,
            CancellationToken.None);
        if (!buildErrors.IsEmpty)
        {
            logger.LogError("Failed to build image {ImageName}: {Errors}", imageName, string.Join(Environment.NewLine, buildErrors));
            return false;
        }
        logger.LogInformation($"Image {imageName} finished building");
        return true;
    }

    sealed class SynchronousProgress<T>(Action<T> report) : IProgress<T>
    {
        public void Report(T value) => report(value);
    }

    static async Task WriteBuildContextAsync(string contextDirectory, TarWriter writer)
    {
        string[] ignorePatterns = File.Exists(Path.Combine(contextDirectory, ".dockerignore"))
            ? File.ReadLines(Path.Combine(contextDirectory, ".dockerignore"))
                .Select(line => line.Trim())
                .Where(line => line.Length > 0 && !line.StartsWith('#') && !line.StartsWith('!'))
                .Select(line => line.TrimStart('/'))
                .Select(line => line.EndsWith('/') ? line + "**" : line)
                .Select(DockerIgnorePatternToRegex)
                .ToArray()
            : [];

        foreach (string entryPath in Directory.EnumerateFileSystemEntries(contextDirectory, "*", SearchOption.AllDirectories))
        {
            string relativePath = Path.GetRelativePath(contextDirectory, entryPath).Replace(Path.DirectorySeparatorChar, '/');
            if (ignorePatterns.Any(pattern => Regex.IsMatch(relativePath, pattern)))
            {
                continue;
            }

            string tarEntryName = Directory.Exists(entryPath) ? relativePath + "/" : relativePath;
            await writer.WriteEntryAsync(entryPath, tarEntryName);
        }
    }

    static string DockerIgnorePatternToRegex(string pattern)
    {
        string regex = Regex.Escape(pattern)
            .Replace(@"\*\*/", @"(?:.*/)?")
            .Replace(@"\*\*", ".*")
            .Replace(@"\*", "[^/]*")
            .Replace(@"\?", "[^/]");
        return $"^{regex}(?:/.*)?$";
    }

    public async Task<bool> DeleteImageAsync(string imageName, Option<ImageDeleteParameters> parameters = default)
    {
        try
        {
            var image = await this.FindImageByName(imageName);
            return await image.Match(
                Some: async _ =>
                {
                    await this._client.Images.DeleteImageAsync(_.ID, parameters.IfNone(new ImageDeleteParameters()
                    {
                        Force = true,
                        NoPrune = false,
                    }));
                    return true;
                },
                None: () => Task.FromResult(false)
            );
        }
        catch (DockerApiException ex)
        {
            logger.LogError(ex, "Failed to delete image {Name}", imageName);
            return false;
        }
    }
}
