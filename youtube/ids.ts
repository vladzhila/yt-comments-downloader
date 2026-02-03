import type { CommentId, VideoId } from './types.ts'

export function asVideoId(value: string): VideoId {
  return value as VideoId
}

export function asCommentId(value: string): CommentId {
  return value as CommentId
}
