import { CANCELLED_ERROR_MESSAGE } from './constants.ts'
import { err, ok } from './result.ts'
import type { Result } from './result.ts'

function abortIfNeeded(signal?: AbortSignal): Result<void> {
  if (!signal?.aborted) return ok(undefined)
  return err(CANCELLED_ERROR_MESSAGE)
}

export { abortIfNeeded }
