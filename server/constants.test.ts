import { expect, test, describe } from 'bun:test'
import { resolveServerPort, SECURITY_HEADERS } from './constants.ts'

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

describe('SECURITY_HEADERS', () => {
  test('includes X-Content-Type-Options', function () {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
  })

  test('includes X-Frame-Options', function () {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY')
  })

  test('includes Referrer-Policy', function () {
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe(
      'strict-origin-when-cross-origin',
    )
  })
})
