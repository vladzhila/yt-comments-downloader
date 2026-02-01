import { DEFAULT_YOUTUBE_URL } from './constants.ts'
import { abortIfNeeded } from './abort.ts'
import { fetchComments, fetchPage } from './fetch.ts'
import {
  extractApiKey,
  extractVideoId,
  extractVideoTitle,
  findInitialContinuation,
} from './html.ts'
import type { CommentResult } from './types.ts'

const DEFAULT_MIN_LIKES = 3
const ERROR_INVALID_URL = 'Invalid YouTube URL or video ID'
const ERROR_NO_API_KEY = 'Could not extract YouTube data. Video may be unavailable.'
const ERROR_NO_COMMENTS = 'Could not find comments section. Comments may be disabled.'

type DownloadOptions = {
  minLikes?: number
  onProgress?: (processed: number, filtered: number) => void
  signal?: AbortSignal
  baseUrl?: string
}

function normalizeBaseUrl(url: string): string {
  if (!url.endsWith('/')) return url
  return url.slice(0, -1)
}

async function downloadComments(
  urlOrId: string,
  options: DownloadOptions = {},
): Promise<CommentResult> {
  const { minLikes = DEFAULT_MIN_LIKES, onProgress, signal, baseUrl } = options
  const abortResult = abortIfNeeded(signal)
  if (!abortResult.ok) {
    return { comments: [], error: abortResult.error }
  }

  const videoId = extractVideoId(urlOrId)
  if (!videoId) {
    return { comments: [], error: ERROR_INVALID_URL }
  }

  const resolvedBaseUrl = normalizeBaseUrl(baseUrl ?? DEFAULT_YOUTUBE_URL)

  const pageResult = await fetchPage(resolvedBaseUrl, videoId, signal)
  if (!pageResult.ok) {
    return { comments: [], error: pageResult.error }
  }

  const html = pageResult.value
  const apiKey = extractApiKey(html)
  const videoTitle = extractVideoTitle(html)

  if (!apiKey) {
    return {
      comments: [],
      error: ERROR_NO_API_KEY,
    }
  }

  const initialEndpoint = findInitialContinuation(html)
  if (!initialEndpoint) {
    return {
      comments: [],
      error: ERROR_NO_COMMENTS,
    }
  }

  const commentsResult = await fetchComments(
    resolvedBaseUrl,
    apiKey,
    initialEndpoint,
    minLikes,
    onProgress,
    signal,
  )
  if (!commentsResult.ok) {
    return { comments: [], error: commentsResult.error }
  }

  const sorted = commentsResult.value.sort((a, b) => b.votes - a.votes)

  return { comments: sorted, videoTitle: videoTitle ?? undefined }
}

export { downloadComments }
