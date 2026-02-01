type Ok<T> = { ok: true; value: T }
type Err = { ok: false; error: string }

type Result<T> = Ok<T> | Err

function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

function err(error: string): Result<never> {
  return { ok: false, error }
}

export { err, ok }
export type { Result }
