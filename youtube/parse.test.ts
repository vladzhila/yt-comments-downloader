import { expect, test } from 'bun:test'
import { REPLY_PARENT_MARKER } from './constants.ts'
import { asCommentId } from './ids.ts'
import { parseCommentsFromMutations, parseVoteCount } from './parse.ts'
import type { Mutation } from './types.ts'

test('parseVoteCount handles suffixes and separators', () => {
  expect(parseVoteCount('1.2k')).toBe(1200)
  expect(parseVoteCount('2M')).toBe(2000000)
  expect(parseVoteCount('1,234')).toBe(1234)
  expect(parseVoteCount('nope')).toBe(0)
  expect(parseVoteCount(undefined)).toBe(0)
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
