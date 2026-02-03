import { expect, test } from 'bun:test'
import { resolveServerPort } from './constants.ts'

const DEFAULT_PORT = 3000

test('resolveServerPort defaults when env missing', function () {
  expect(resolveServerPort(undefined)).toBe(DEFAULT_PORT)
})

test('resolveServerPort accepts numeric env values', function () {
  expect(resolveServerPort('8080')).toBe(8080)
})

test('resolveServerPort allows zero for ephemeral port', function () {
  expect(resolveServerPort('0')).toBe(0)
})

test('resolveServerPort falls back on invalid env values', function () {
  expect(resolveServerPort('not-a-number')).toBe(DEFAULT_PORT)
})
