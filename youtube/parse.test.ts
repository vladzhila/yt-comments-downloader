import { expect, test } from 'bun:test'
import { REPLY_PARENT_MARKER } from './constants.ts'
import { asCommentId } from './ids.ts'
import {
  parseCommentsFromMutations,
  parseVoteCount,
  searchDict,
} from './parse.ts'
import type { Mutation } from './types.ts'

test('parseVoteCount handles suffixes and separators', () => {
  expect(parseVoteCount('1.2k')).toBe(1200)
  expect(parseVoteCount('2M')).toBe(2000000)
  expect(parseVoteCount('1,234')).toBe(1234)
  expect(parseVoteCount('nope')).toBe(0)
  expect(parseVoteCount(undefined)).toBe(0)
})

test('parseVoteCount handles plain numbers', () => {
  expect(parseVoteCount('42')).toBe(42)
  expect(parseVoteCount('0')).toBe(0)
})

test('parseVoteCount handles whitespace', () => {
  expect(parseVoteCount(' 100 ')).toBe(100)
})

test('searchDict finds key at top level', () => {
  const obj = { foo: 'bar' }
  const results = [...searchDict(obj, 'foo')]
  expect(results).toEqual(['bar'])
})

test('searchDict finds nested keys', () => {
  const obj = { level1: { level2: { target: 'found' } } }
  const results = [...searchDict(obj, 'target')]
  expect(results).toEqual(['found'])
})

test('searchDict finds keys in arrays', () => {
  const obj = { items: [{ target: 'first' }, { target: 'second' }] }
  const results = [...searchDict(obj, 'target')]
  expect(results).toContain('first')
  expect(results).toContain('second')
})

test('searchDict returns empty for non-existent key', () => {
  const obj = { foo: 'bar' }
  const results = [...searchDict(obj, 'missing')]
  expect(results).toEqual([])
})

test('searchDict handles null and undefined', () => {
  expect([...searchDict(null, 'key')]).toEqual([])
  expect([...searchDict(undefined, 'key')]).toEqual([])
})

test('searchDict handles primitive values', () => {
  expect([...searchDict('string', 'key')]).toEqual([])
  expect([...searchDict(123, 'key')]).toEqual([])
})

test('searchDict finds multiple occurrences', () => {
  const obj = {
    a: { target: 1 },
    b: { target: 2 },
  }
  const results = [...searchDict(obj, 'target')]
  expect(results).toHaveLength(2)
  expect(results).toContain(1)
  expect(results).toContain(2)
})

test('parseCommentsFromMutations filters likes and marks replies', () => {
  const mutations: Mutation[] = [
    {
      payload: {
        commentEntityPayload: {
          key: 'c1',
          properties: {
            commentId: 'c1',
            content: { content: 'Hello' },
            publishedTime: 'now',
            replyLevel: 0,
          },
          author: { displayName: 'Alice' },
          toolbar: { likeCountNotliked: '4' },
        },
      },
    },
    {
      payload: {
        commentEntityPayload: {
          key: 'c2',
          properties: {
            commentId: 'c2',
            content: { content: 'Reply' },
            publishedTime: 'later',
            replyLevel: 1,
          },
          author: { displayName: 'Bob' },
          toolbar: { likeCountNotliked: '5' },
        },
      },
    },
    {
      payload: {
        commentEntityPayload: {
          key: 'c3',
          properties: {
            commentId: 'c3',
            content: { content: 'Low' },
            publishedTime: 'later',
            replyLevel: 0,
          },
          author: { displayName: 'Eve' },
          toolbar: { likeCountNotliked: '1' },
        },
      },
    },
  ]

  const comments = parseCommentsFromMutations(mutations, 3)
  expect(comments).toHaveLength(2)

  const reply = comments.find((comment) => comment.cid === asCommentId('c2'))
  expect(reply?.parent).toBe(REPLY_PARENT_MARKER)
})
