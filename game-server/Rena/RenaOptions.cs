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
}
