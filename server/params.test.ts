import { expect, test } from 'bun:test'
import { DEFAULT_DOWNLOAD_FORMAT } from './constants.ts'
import { parseRequestParams } from './params.ts'

const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

test('parseRequestParams defaults minLikes and format', () => {
  const req = new Request(`http://localhost/api/comments?url=${VIDEO_URL}`)
  const result = parseRequestParams(req)
  if (result instanceof Response) throw new Error('Expected parsed params')

  expect(result.minLikes).toBe(0)
  expect(result.format).toBe(DEFAULT_DOWNLOAD_FORMAT)
})

test('parseRequestParams rejects invalid minLikes', async () => {
  const req = new Request(`http://localhost/api/comments?url=${VIDEO_URL}&minLikes=abc`)
  const result = parseRequestParams(req)

  expect(result instanceof Response).toBe(true)
  if (!(result instanceof Response)) throw new Error('Expected error response')

  const body = await result.json()
  expect(body).toEqual({ error: 'Invalid query parameters' })
})
