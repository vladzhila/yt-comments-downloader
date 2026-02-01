import type { Comment, Mutation } from './types.ts'

function* searchDict(obj: unknown, searchKey: string): Generator<unknown> {
  const stack: unknown[] = [obj]
  while (stack.length > 0) {
    const current = stack.pop()
    if (current && typeof current === 'object') {
      if (Array.isArray(current)) {
        stack.push(...current)
      } else {
        for (const [key, value] of Object.entries(current)) {
          if (key === searchKey) yield value
          else stack.push(value)
        }
      }
    }
  }
}

function parseVoteCount(text: string | undefined): number {
  if (!text) return 0
  const cleaned = text.replace(/[,\s]/g, '').toLowerCase()
  if (cleaned.endsWith('k')) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000)
  }
  if (cleaned.endsWith('m')) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000000)
  }
  return parseInt(cleaned, 10) || 0
}

function parseCommentsFromMutations(mutations: Mutation[], minLikes: number): Comment[] {
  const comments: Comment[] = []

  for (const mutation of mutations) {
    const payload = mutation.payload?.commentEntityPayload
    if (!payload) continue

    const props = payload.properties
    if (!props?.commentId || !props.content?.content) continue

    const votes = parseVoteCount(payload.toolbar?.likeCountNotliked)
    if (votes < minLikes) continue

    comments.push({
      cid: props.commentId,
      text: props.content.content,
      author: payload.author?.displayName ?? 'Unknown',
      votes,
      time: props.publishedTime ?? '',
      parent: props.replyLevel && props.replyLevel > 0 ? 'reply' : undefined,
    })
  }

  return comments
}

export { searchDict, parseVoteCount, parseCommentsFromMutations }
