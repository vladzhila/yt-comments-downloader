import { YOUTUBE_PATTERNS } from './constants.js'

export function isLikelyVideoId(value) {
  return value.length === 11 && !value.includes('/')
}

export function isValidYouTubeUrl(value) {
  if (isLikelyVideoId(value)) {
    return true
  }
  return YOUTUBE_PATTERNS.some((pattern) => pattern.test(value))
}
