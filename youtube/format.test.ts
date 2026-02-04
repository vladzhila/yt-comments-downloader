import { expect, test } from 'bun:test'
import * as XLSX from 'xlsx'
import { asCommentId } from './ids.ts'
import {
  commentsToCSV,
  commentsToJSON,
  commentsToMarkdown,
  commentsToXlsx,
} from './format.ts'
import type { Comment } from './types.ts'

const SAMPLE_COMMENTS: Comment[] = [
  {
    cid: asCommentId('c1'),
    text: 'Hello world',
    author: 'Alice',
    votes: 10,
    time: '1 day ago',
  },
  {
    cid: asCommentId('c2'),
    text: 'This is a reply',
    author: 'Bob',
    votes: 5,
    time: '2 hours ago',
    parent: 'reply',
  },
]

test('commentsToCSV generates valid CSV', () => {
  const csv = commentsToCSV(SAMPLE_COMMENTS)
  const lines = csv.split('\n')
  expect(lines[0]).toBe(
    'published_time,author,likes,comment_id,parent_id,comment',
  )
  expect(lines[1]).toBe('"1 day ago","Alice",10,"c1","","Hello world"')
  expect(lines[2]).toBe('"2 hours ago","Bob",5,"c2","reply","This is a reply"')
})

test('commentsToCSV escapes quotes in text', () => {
  const comments: Comment[] = [
    {
      cid: asCommentId('c1'),
      text: 'He said "hello"',
      author: 'Test',
      votes: 1,
      time: 'now',
    },
  ]
  const csv = commentsToCSV(comments)
  expect(csv).toContain('He said ""hello""')
})

test('commentsToCSV escapes quotes in author', () => {
  const comments: Comment[] = [
    {
      cid: asCommentId('c1'),
      text: 'Test',
      author: 'User "Nick"',
      votes: 1,
      time: 'now',
    },
  ]
  const csv = commentsToCSV(comments)
  expect(csv).toContain('User ""Nick""')
})

test('commentsToCSV handles empty comments', () => {
  const csv = commentsToCSV([])
  expect(csv).toBe('published_time,author,likes,comment_id,parent_id,comment')
})

test('commentsToJSON generates valid JSON', () => {
  const json = commentsToJSON(SAMPLE_COMMENTS)
  const parsed = JSON.parse(json)
  expect(parsed.comments).toHaveLength(2)
  expect(parsed.comments[0].cid).toBe('c1')
  expect(parsed.comments[1].parent).toBe('reply')
})

test('commentsToJSON handles empty comments', () => {
  const json = commentsToJSON([])
  const parsed = JSON.parse(json)
  expect(parsed.comments).toEqual([])
})

test('commentsToMarkdown generates valid markdown table', () => {
  const md = commentsToMarkdown(SAMPLE_COMMENTS)
  const lines = md.split('\n')
  expect(lines[0]).toBe(
    '| published_time | author | likes | comment_id | parent_id | comment |',
  )
  expect(lines[1]).toBe('| --- | --- | --- | --- | --- | --- |')
  expect(lines[2]).toBe('| 1 day ago | Alice | 10 | c1 |  | Hello world |')
})

test('commentsToMarkdown escapes pipe characters', () => {
  const comments: Comment[] = [
    {
      cid: asCommentId('c1'),
      text: 'A | B | C',
      author: 'Test',
      votes: 1,
      time: 'now',
    },
  ]
  const md = commentsToMarkdown(comments)
  expect(md).toContain('A \\| B \\| C')
})

test('commentsToMarkdown escapes newlines', () => {
  const comments: Comment[] = [
    {
      cid: asCommentId('c1'),
      text: 'Line 1\nLine 2',
      author: 'Test',
      votes: 1,
      time: 'now',
    },
  ]
  const md = commentsToMarkdown(comments)
  expect(md).toContain('Line 1<br>Line 2')
})

test('commentsToMarkdown handles empty comments', () => {
  const md = commentsToMarkdown([])
  const lines = md.split('\n')
  expect(lines).toHaveLength(2)
})

test('commentsToXlsx generates valid workbook', () => {
  const data = commentsToXlsx(SAMPLE_COMMENTS)
  expect(data).toBeInstanceOf(Uint8Array)
  const workbook = XLSX.read(data)
  expect(workbook.SheetNames).toContain('comments')
  expect(workbook.SheetNames).toContain('replies')
})

test('commentsToXlsx separates comments and replies', () => {
  const data = commentsToXlsx(SAMPLE_COMMENTS)
  const workbook = XLSX.read(data)
  const commentsSheetData = workbook.Sheets['comments']
  const repliesSheetData = workbook.Sheets['replies']
  if (!commentsSheetData || !repliesSheetData) {
    throw new Error('Expected sheets to exist')
  }
  const commentsSheet = XLSX.utils.sheet_to_json(commentsSheetData)
  const repliesSheet = XLSX.utils.sheet_to_json(repliesSheetData)
  expect(commentsSheet).toHaveLength(1)
  expect(repliesSheet).toHaveLength(1)
})

test('commentsToXlsx handles empty comments', () => {
  const data = commentsToXlsx([])
  const workbook = XLSX.read(data)
  expect(workbook.SheetNames).toContain('comments')
  expect(workbook.SheetNames).toContain('replies')
})
