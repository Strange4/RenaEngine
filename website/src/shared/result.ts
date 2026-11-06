type Sucess<T> = {
  error: null,
  data: T
}

type Fail<E = unknown> = {
  error: E,
  data: null
}

export type Result<T, E = unknown> = Sucess<T> | Fail<E>;
