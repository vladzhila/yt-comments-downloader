import { expect, test } from 'bun:test'
import {
  FORMAT_META,
  buildDownloadData,
  buildDownloadFilename,
  buildStreamPayload,
  parseDownloadFormat,
} from './formats.ts'
import {
  DEFAULT_DOWNLOAD_FORMAT,
  FALLBACK_FILENAME_PREFIX,
  STREAM_ENCODING_BASE64,
  STREAM_ENCODING_TEXT,
} from './constants.ts'
import { asCommentId, asVideoId } from '../youtube/ids.ts'
import type { Comment } from '../youtube/types.ts'

const VIDEO_ID = asVideoId('dQw4w9WgXcQ')
const COMMENTS: Comment[] = [
  {
    cid: asCommentId('c1'),
    text: 'Hello',
    author: 'User',
    votes: 1,
    time: 'now',
  },
]

test('parseDownloadFormat defaults on missing or invalid values', () => {
  expect(parseDownloadFormat(null)).toBe(DEFAULT_DOWNLOAD_FORMAT)
  expect(parseDownloadFormat('nope')).toBe(DEFAULT_DOWNLOAD_FORMAT)
})

test('parseDownloadFormat accepts valid values', () => {
  expect(parseDownloadFormat('json')).toBe('json')
})

test('buildDownloadFilename sanitizes title and falls back to id', () => {
  const sanitized = buildDownloadFilename(
    ' Test:/Video*Title  ',
    VIDEO_ID,
    'csv',
  )
  expect(sanitized).toBe('TestVideoTitle.csv')

  const fallback = buildDownloadFilename(undefined, VIDEO_ID, 'json')
  expect(fallback).toBe(`${FALLBACK_FILENAME_PREFIX}${String(VIDEO_ID)}.json`)
})

test('buildDownloadData returns csv output', () => {
  const data = buildDownloadData('csv', COMMENTS)
  expect(typeof data).toBe('string')
  expect(data).toContain('comment_id')
})

test('buildStreamPayload returns text encoding for csv', () => {
  const payload = buildStreamPayload('csv', COMMENTS, 'file.csv')
  expect(payload.encoding).toBe(STREAM_ENCODING_TEXT)
  expect(payload.mimeType).toBe(FORMAT_META.csv.mimeType)
  expect(payload.filename).toBe('file.csv')
  expect(payload.data).toContain('comment_id')
})

test('buildStreamPayload returns base64 for xlsx', () => {
  const payload = buildStreamPayload('xlsx', COMMENTS, 'file.xlsx')
  expect(payload.encoding).toBe(STREAM_ENCODING_BASE64)
  expect(payload.mimeType).toBe(FORMAT_META.xlsx.mimeType)
  expect(payload.filename).toBe('file.xlsx')
  const bytes = Buffer.from(payload.data, 'base64')
  expect(bytes.length).toBeGreaterThan(0)
})
