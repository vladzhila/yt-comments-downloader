import type { ContinuationEndpoint } from './types.ts'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isContinuationEndpoint(
  value: unknown,
): value is ContinuationEndpoint {
  if (!isRecord(value)) {
    return false
  }
  const continuationCommand = value.continuationCommand
  if (continuationCommand !== undefined && !isRecord(continuationCommand)) {
    return false
  }
  const commandMetadata = value.commandMetadata
  if (commandMetadata !== undefined && !isRecord(commandMetadata)) {
    return false
  }
  return true
}
