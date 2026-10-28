using System.Runtime.Serialization;

namespace BattleshipServer.Game.Models;

[DataContract]
public record ActionExecutionResult
{
    [DataMember(Order = 1)]
    public ActionStatus Status { get; init; } = ActionStatus.UnknownAction;

    [DataMember(Order = 2)]
    public ShotResult ShotResult { get; init; } = ShotResult.ShotResultUnknown;

    [DataMember(Order = 3)]
    public bool IsWin { get; init; } = false;

    public ActionExecutionResult() { }

    public ActionExecutionResult(
        ActionStatus status,
        ShotResult shotResult = ShotResult.ShotResultUnknown,
        bool isWin = false
    )
    {
        this.Status = status;
        this.ShotResult = shotResult;
        this.IsWin = isWin;
    }
}
