import { extractVideoId } from '../youtube.ts'
import { FORMAT_QUERY_PARAM } from './constants.ts'
import { parseDownloadFormat } from './formats.ts'
import type { DownloadFormat } from './formats.ts'

type RequestParams = {
  videoUrl: string
  videoId: string
  minLikes: number
  format: DownloadFormat
}

function parseRequestParams(req: Request): RequestParams | Response {
  const url = new URL(req.url)
  const videoUrl = url.searchParams.get('url')
  if (!videoUrl) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  const videoId = extractVideoId(videoUrl)
  if (!videoId) {
    return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  const minLikes = parseInt(url.searchParams.get('minLikes') ?? '0', 10)
  const format = parseDownloadFormat(url.searchParams.get(FORMAT_QUERY_PARAM))

  return { videoUrl, videoId, minLikes, format }
}

export { parseRequestParams }
export type { RequestParams }
