import type { CommentId, VideoId } from './types.ts'

function asVideoId(value: string): VideoId {
  return value as VideoId
}

function asCommentId(value: string): CommentId {
  return value as CommentId
}

export { asCommentId, asVideoId }
