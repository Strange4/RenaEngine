namespace Rena.Utility;

public class Result<T>
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
}
