import { z } from 'zod'
import { extractVideoId } from '../youtube.ts'
import { FORMAT_QUERY_PARAM } from './constants.ts'
import { parseDownloadFormat } from './formats.ts'
import type { DownloadFormat } from './formats.ts'
import type { VideoId } from '../youtube/types.ts'

const DEFAULT_MIN_LIKES = 0
const REQUEST_PARAMS_SCHEMA = z.object({
  url: z.string().min(1),
  minLikes: z.coerce.number().int().nonnegative(),
  format: z.string().optional(),
})

type RequestParams = {
  videoUrl: string
  videoId: VideoId
  minLikes: number
  format: DownloadFormat
}

function parseRequestParams(req: Request): RequestParams | Response {
  const url = new URL(req.url)
  const parsed = REQUEST_PARAMS_SCHEMA.safeParse({
    url: url.searchParams.get('url'),
    minLikes: url.searchParams.get('minLikes') ?? String(DEFAULT_MIN_LIKES),
    format: url.searchParams.get(FORMAT_QUERY_PARAM) ?? undefined,
  })
  if (!parsed.success) {
    const missingUrl = parsed.error.issues.some((issue) => issue.path[0] === 'url')
    const error = missingUrl ? 'Missing url parameter' : 'Invalid query parameters'
    return Response.json({ error }, { status: 400 })
  }

  const videoUrl = parsed.data.url

  const videoId = extractVideoId(videoUrl)
  if (!videoId) {
    return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  const minLikes = parsed.data.minLikes
  const format = parseDownloadFormat(parsed.data.format ?? null)

  return { videoUrl, videoId, minLikes, format }
}

export { parseRequestParams }
export type { RequestParams }
