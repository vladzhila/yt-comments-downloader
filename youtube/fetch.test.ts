import { expect, test } from 'bun:test'
import { fetchPage } from './fetch.ts'
import { CANCELLED_ERROR_MESSAGE, UNKNOWN_ERROR_MESSAGE } from './constants.ts'
import { asVideoId } from './ids.ts'

const VIDEO_ID = asVideoId('dQw4w9WgXcQ')
const BAD_BASE_URL = 'http://127.0.0.1:9'

test('fetchPage returns error on request failure', async () => {
  const result = await fetchPage(BAD_BASE_URL, VIDEO_ID)
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error('Expected error')

  expect(result.error).not.toBe(CANCELLED_ERROR_MESSAGE)
  expect(result.error).not.toBe(UNKNOWN_ERROR_MESSAGE)
})

test('fetchPage returns cancelled error when aborted', async () => {
  const controller = new AbortController()
  controller.abort()

  const result = await fetchPage(BAD_BASE_URL, VIDEO_ID, controller.signal)
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error('Expected error')

  expect(result.error).toBe(CANCELLED_ERROR_MESSAGE)
})
