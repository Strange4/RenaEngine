namespace Rena.Utility;

internal class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public Exception? Exception { get; }

    public Result(T value)
    {
        this.Value = value;
        this.IsSuccess = true;
    }

    public Result(Exception e)
    {
        this.IsSuccess = false;
        this.Exception = e;
    }

    public static implicit operator Result<T>(LanguageExt.Common.Result<T> inputResult)
    {
        Result<T> returnResult = null!;
        _ = inputResult.Match(successT => returnResult = new Result<T>(successT), failT => returnResult = new Result<T>(failT));
        return returnResult;
    }
}
