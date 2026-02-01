import { CANCELLED_ERROR_MESSAGE, DEFAULT_YOUTUBE_URL } from './constants.ts'
import { isAbortError } from './abort.ts'
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
  const videoId = extractVideoId(urlOrId)
  if (!videoId) {
    return { comments: [], error: ERROR_INVALID_URL }
  }

  const resolvedBaseUrl = normalizeBaseUrl(baseUrl ?? DEFAULT_YOUTUBE_URL)

  try {
    const html = await fetchPage(resolvedBaseUrl, videoId, signal)
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

    const comments = await fetchComments(
      resolvedBaseUrl,
      apiKey,
      initialEndpoint,
      minLikes,
      onProgress,
      signal,
    )
    const sorted = comments.sort((a, b) => b.votes - a.votes)

    return { comments: sorted, videoTitle: videoTitle ?? undefined }
  } catch (err) {
    if (isAbortError(err)) {
      return { comments: [], error: CANCELLED_ERROR_MESSAGE }
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { comments: [], error: message }
  }
}

export { downloadComments }
