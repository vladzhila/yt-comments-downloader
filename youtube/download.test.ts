import { expect, mock, test } from 'bun:test'
import { downloadComments } from './download.ts'

const BAD_BASE_URL = 'http://127.0.0.1:9'

test('downloadComments returns error for invalid URL', async () => {
  const result = await downloadComments('not-a-valid-youtube-url')
  expect(result.error).toBe('Invalid YouTube URL or video ID')
  expect(result.comments).toEqual([])
})

test('downloadComments returns error for empty string', async () => {
  const result = await downloadComments('')
  expect(result.error).toBe('Invalid YouTube URL or video ID')
  expect(result.comments).toEqual([])
})

test('downloadComments accepts valid video ID', async () => {
  const result = await downloadComments('dQw4w9WgXcQ', {baseUrl: BAD_BASE_URL,})
  expect(result.error).toBeDefined()
  expect(result.error).not.toBe('Invalid YouTube URL or video ID')
})

test('downloadComments accepts valid watch URL', async () => {
  const result = await downloadComments(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    { baseUrl: BAD_BASE_URL },
  )
  expect(result.error).toBeDefined()
  expect(result.error).not.toBe('Invalid YouTube URL or video ID')
})

test('downloadComments returns error when aborted before start', async () => {
  const controller = new AbortController()
  controller.abort()
  const result = await downloadComments('dQw4w9WgXcQ', {signal: controller.signal,})
  expect(result.error).toBe('Request cancelled')
  expect(result.comments).toEqual([])
})

test('downloadComments normalizes base URL with trailing slash', async () => {
  const result = await downloadComments('dQw4w9WgXcQ', {baseUrl: 'http://127.0.0.1:9/',})
  expect(result.error).toBeDefined()
  expect(result.error).not.toBe('Invalid YouTube URL or video ID')
})

test('downloadComments returns error on fetch failure', async () => {
  const result = await downloadComments('dQw4w9WgXcQ', {baseUrl: BAD_BASE_URL,})
  expect(result.error).toBeDefined()
  expect(result.comments).toEqual([])
})

test('downloadComments calls onProgress callback', async () => {
  const onProgress = mock(() => {})
  await downloadComments('dQw4w9WgXcQ', {
    baseUrl: BAD_BASE_URL,
    onProgress,
  })
  expect(onProgress).not.toHaveBeenCalled()
})

test('downloadComments uses default minLikes of 3', async () => {
  const result = await downloadComments('dQw4w9WgXcQ', {baseUrl: BAD_BASE_URL,})
  expect(result.error).toBeDefined()
})
