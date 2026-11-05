using System.ComponentModel.DataAnnotations;

namespace Rena;

public record class RenaOptions
{
    public const string SectionName = "RenaOptions";

    public int ServerPort { get; set; } = 3000;

    [Required]
#pragma warning disable CS8618
    public string TSProtoPath { get; set; }
#pragma warning restore CS8618

    public string GenerationDirectory { get; set; } = "./sdks";

    public string UploadsDirectory { get; set; } = "./uploads";

    public uint MaxZipFileSizeBytes { get; set; } = 1 << 23; // 8 MiB

    [Required]
    public string AdminToken { get; set; } = "ADMIN-change-me";

    public Dictionary<string, bool> Features { get; set; } =
        new(StringComparer.OrdinalIgnoreCase) { ["test-feature"] = false, ["sdk-downloads"] = false };

    [Required]
    public int RoomSize { get; set; } = 2;
}
