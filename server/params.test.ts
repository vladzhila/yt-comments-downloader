import { expect, test } from 'bun:test'
import { asVideoId } from '../youtube/ids.ts'
import { DEFAULT_DOWNLOAD_FORMAT } from './constants.ts'
import { parseRequestParams } from './params.ts'

const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

test('parseRequestParams defaults minLikes and format', () => {
  const req = new Request(`http://localhost/api/comments?url=${VIDEO_URL}`)
  const result = parseRequestParams(req)
  if (result instanceof Response) {
    throw new Error('Expected parsed params')
  }

  expect(result.minLikes).toBe(0)
  expect(result.format).toBe(DEFAULT_DOWNLOAD_FORMAT)
})

test('parseRequestParams rejects invalid minLikes', async () => {
  const req = new Request(
    `http://localhost/api/comments?url=${VIDEO_URL}&minLikes=abc`,
  )
  const result = parseRequestParams(req)

  expect(result instanceof Response).toBe(true)
  if (!(result instanceof Response)) {
    throw new Error('Expected error response')
  }

  const body = await result.json()
  expect(body).toEqual({ error: 'Invalid query parameters' })
})

test('parseRequestParams rejects missing url parameter', async () => {
  const req = new Request('http://localhost/api/comments')
  const result = parseRequestParams(req)

  expect(result instanceof Response).toBe(true)
  if (!(result instanceof Response)) {
    throw new Error('Expected error response')
  }

  const body = await result.json()
  expect(body).toEqual({ error: 'Missing url parameter' })
})

test('parseRequestParams rejects invalid YouTube URL', async () => {
  const req = new Request(
    'http://localhost/api/comments?url=https://example.com',
  )
  const result = parseRequestParams(req)

  expect(result instanceof Response).toBe(true)
  if (!(result instanceof Response)) {
    throw new Error('Expected error response')
  }

  const body = await result.json()
  expect(body).toEqual({ error: 'Invalid YouTube URL' })
})

test('parseRequestParams accepts valid format parameter', () => {
  const req = new Request(
    `http://localhost/api/comments?url=${VIDEO_URL}&format=json`,
  )
  const result = parseRequestParams(req)
  if (result instanceof Response) {
    throw new Error('Expected parsed params')
  }

  expect(result.format).toBe('json')
})

test('parseRequestParams defaults invalid format to csv', () => {
  const req = new Request(
    `http://localhost/api/comments?url=${VIDEO_URL}&format=invalid`,
  )
  const result = parseRequestParams(req)
  if (result instanceof Response) {
    throw new Error('Expected parsed params')
  }

  expect(result.format).toBe(DEFAULT_DOWNLOAD_FORMAT)
})

test('parseRequestParams accepts minLikes of 0', () => {
  const req = new Request(
    `http://localhost/api/comments?url=${VIDEO_URL}&minLikes=0`,
  )
  const result = parseRequestParams(req)
  if (result instanceof Response) {
    throw new Error('Expected parsed params')
  }

  expect(result.minLikes).toBe(0)
})

test('parseRequestParams accepts positive minLikes', () => {
  const req = new Request(
    `http://localhost/api/comments?url=${VIDEO_URL}&minLikes=100`,
  )
  const result = parseRequestParams(req)
  if (result instanceof Response) {
    throw new Error('Expected parsed params')
  }

  expect(result.minLikes).toBe(100)
})

test('parseRequestParams extracts videoId from URL', () => {
  const req = new Request(`http://localhost/api/comments?url=${VIDEO_URL}`)
  const result = parseRequestParams(req)
  if (result instanceof Response) {
    throw new Error('Expected parsed params')
  }

  expect(result.videoId).toBe(asVideoId('dQw4w9WgXcQ'))
})
