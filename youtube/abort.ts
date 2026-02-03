import { ok, err, type Result } from 'neverthrow'
import { CANCELLED_ERROR_MESSAGE } from './constants.ts'

export function abortIfNeeded(signal?: AbortSignal): Result<void, string> {
  if (!signal?.aborted) {
    return ok(undefined)
  }
  return err(CANCELLED_ERROR_MESSAGE)
}
