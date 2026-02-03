import { REPLY_PARENT_MARKER } from './constants.ts'
import { asCommentId } from './ids.ts'
import { isRecord } from './guards.ts'
import type { Comment, Mutation } from './types.ts'

const VOTE_SUFFIXES = {
  k: 1_000,
  m: 1_000_000,
} as const

const UNKNOWN_AUTHOR = 'Unknown'

type VoteSuffix = keyof typeof VOTE_SUFFIXES

function isVoteSuffix(value: string): value is VoteSuffix {
  return Object.hasOwn(VOTE_SUFFIXES, value)
}

export function* searchDict(
  obj: unknown,
  searchKey: string,
): Generator<unknown> {
  const stack: unknown[] = [obj]
  while (stack.length > 0) {
    const current = stack.pop()
    if (Array.isArray(current)) {
      stack.push(...current)
      continue
    }
    if (!isRecord(current)) {
      continue
    }
    for (const [key, value] of Object.entries(current)) {
      if (key === searchKey) {
        yield value
        continue
      }
      stack.push(value)
    }
  }
}

export function parseVoteCount(text: string | undefined): number {
  if (!text) {
    return 0
  }
  const cleaned = text.replace(/[,\s]/g, '').toLowerCase()
  const suffix = cleaned.slice(-1)
  if (isVoteSuffix(suffix)) {
    const value = Number.parseFloat(cleaned.slice(0, -1))
    if (Number.isNaN(value)) {
      return 0
    }
    return Math.round(value * VOTE_SUFFIXES[suffix])
  }

  const value = Number.parseInt(cleaned, 10)
  return Number.isNaN(value) ? 0 : value
}

export function parseCommentsFromMutations(
  mutations: Mutation[],
  minLikes: number,
): Comment[] {
  const comments: Comment[] = []

  for (const mutation of mutations) {
    const payload = mutation.payload?.commentEntityPayload
    if (!payload) {
      continue
    }

    const props = payload.properties
    if (!props?.commentId || !props.content?.content) {
      continue
    }

    const votes = parseVoteCount(payload.toolbar?.likeCountNotliked)
    if (votes < minLikes) {
      continue
    }

    const isReply = typeof props.replyLevel === 'number' && props.replyLevel > 0

    comments.push({
      cid: asCommentId(props.commentId),
      text: props.content.content,
      author: payload.author?.displayName ?? UNKNOWN_AUTHOR,
      votes,
      time: props.publishedTime ?? '',
      parent: isReply ? REPLY_PARENT_MARKER : undefined,
    })
  }

  return comments
}
