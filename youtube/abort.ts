import { ABORT_ERROR_NAME, CANCELLED_ERROR_MESSAGE } from './constants.ts'

function createAbortError(): Error {
  const err = new Error(CANCELLED_ERROR_MESSAGE)
  err.name = ABORT_ERROR_NAME
  return err
}

function abortIfNeeded(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  throw createAbortError()
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === ABORT_ERROR_NAME
}

export { abortIfNeeded, isAbortError }
