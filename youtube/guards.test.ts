import { expect, test } from 'bun:test'
import { isContinuationEndpoint, isRecord } from './guards.ts'

test('isRecord returns true for plain objects', () => {
  expect(isRecord({})).toBe(true)
  expect(isRecord({ foo: 'bar' })).toBe(true)
})

test('isRecord returns false for non-objects', () => {
  expect(isRecord(null)).toBe(false)
  expect(isRecord(undefined)).toBe(false)
  expect(isRecord('string')).toBe(false)
  expect(isRecord(123)).toBe(false)
  expect(isRecord(true)).toBe(false)
})

test('isRecord returns false for arrays', () => {
  expect(isRecord([])).toBe(false)
  expect(isRecord([1, 2, 3])).toBe(false)
})

test('isContinuationEndpoint returns true for valid endpoint', () => {
  const endpoint = { continuationCommand: { token: 'abc123' } }
  expect(isContinuationEndpoint(endpoint)).toBe(true)
})

test('isContinuationEndpoint returns true for empty object', () => {
  expect(isContinuationEndpoint({})).toBe(true)
})

test('isContinuationEndpoint returns true with commandMetadata', () => {
  const endpoint = {
    continuationCommand: { token: 'abc' },
    commandMetadata: { webCommandMetadata: {} },
  }
  expect(isContinuationEndpoint(endpoint)).toBe(true)
})

test('isContinuationEndpoint returns false for non-objects', () => {
  expect(isContinuationEndpoint(null)).toBe(false)
  expect(isContinuationEndpoint('string')).toBe(false)
  expect(isContinuationEndpoint([])).toBe(false)
})

test('isContinuationEndpoint returns false when continuationCommand is not a record', () => {
  expect(isContinuationEndpoint({ continuationCommand: 'string' })).toBe(false)
  expect(isContinuationEndpoint({ continuationCommand: [] })).toBe(false)
  expect(isContinuationEndpoint({ continuationCommand: 123 })).toBe(false)
})

test('isContinuationEndpoint returns false when commandMetadata is not a record', () => {
  expect(isContinuationEndpoint({ commandMetadata: 'string' })).toBe(false)
  expect(isContinuationEndpoint({ commandMetadata: [] })).toBe(false)
  expect(isContinuationEndpoint({ commandMetadata: 123 })).toBe(false)
})
