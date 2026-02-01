import index from './index.html'
import {
  downloadComments,
  commentsToCSV,
  commentsToJSON,
  commentsToMarkdown,
  commentsToXlsx,
  extractVideoId,
} from './youtube.ts'
import type { Comment } from './youtube.ts'

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

const DEFAULT_DOWNLOAD_FORMAT = 'csv'
const FALLBACK_FILENAME_PREFIX = 'yt_'
const STREAM_ENCODING_TEXT = 'utf-8'
const STREAM_ENCODING_BASE64 = 'base64'
const FORMAT_QUERY_PARAM = 'format'
const STREAM_IDLE_TIMEOUT_SECONDS = 120

const FORMAT_META = {
  csv: { extension: 'csv', mimeType: 'text/csv; charset=utf-8' },
  json: { extension: 'json', mimeType: 'application/json; charset=utf-8' },
  xlsx: {
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  md: { extension: 'md', mimeType: 'text/markdown; charset=utf-8' },
} as const

const FORMAT_BUILDERS = {
  csv: commentsToCSV,
  json: commentsToJSON,
  md: commentsToMarkdown,
  xlsx: commentsToXlsx,
} satisfies Record<DownloadFormat, (comments: readonly Comment[]) => string | Uint8Array>

type DownloadFormat = keyof typeof FORMAT_META
type StreamEncoding = typeof STREAM_ENCODING_TEXT | typeof STREAM_ENCODING_BASE64

type RequestParams = {
  videoUrl: string
  videoId: string
  minLikes: number
  format: DownloadFormat
}

function isDownloadFormat(value: string): value is DownloadFormat {
  return Object.hasOwn(FORMAT_META, value)
}

function parseDownloadFormat(value: string | null): DownloadFormat {
  if (!value) return DEFAULT_DOWNLOAD_FORMAT
  return isDownloadFormat(value) ? value : DEFAULT_DOWNLOAD_FORMAT
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

function buildDownloadFilename(
  videoTitle: string | undefined,
  videoId: string,
  format: DownloadFormat,
): string {
  const baseName = videoTitle
    ? sanitizeFilename(videoTitle)
    : `${FALLBACK_FILENAME_PREFIX}${videoId}`
  return `${baseName}.${FORMAT_META[format].extension}`
}

function buildDownloadData(
  format: DownloadFormat,
  comments: readonly Comment[],
): string | Uint8Array {
  return FORMAT_BUILDERS[format](comments)
}

function buildStreamPayload(
  format: DownloadFormat,
  comments: readonly Comment[],
  filename: string,
): { data: string; encoding: StreamEncoding; filename: string; mimeType: string } {
  const data = buildDownloadData(format, comments)
  const mimeType = FORMAT_META[format].mimeType

  if (typeof data === 'string') {
    return { data, encoding: STREAM_ENCODING_TEXT, filename, mimeType }
  }

  const base64 = Buffer.from(data).toString('base64')
  return { data: base64, encoding: STREAM_ENCODING_BASE64, filename, mimeType }
}

const server = Bun.serve({
  port: 3000,
  idleTimeout: STREAM_IDLE_TIMEOUT_SECONDS,
  routes: {
    '/': index,

    '/api/comments': {
      async GET(req) {
        const params = parseRequestParams(req)
        if (params instanceof Response) return params
        const { videoUrl, videoId, minLikes, format } = params

        const result = await downloadComments(videoUrl, { minLikes, signal: req.signal })

        if (result.error) {
          return Response.json({ error: result.error }, { status: 500 })
        }

        const data = buildDownloadData(format, result.comments)
        const filename = buildDownloadFilename(result.videoTitle, videoId, format)

        return new Response(data, {
          headers: {
            'Content-Type': FORMAT_META[format].mimeType,
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      },
    },

    '/api/comments/stream': {
      async GET(req) {
        const params = parseRequestParams(req)
        if (params instanceof Response) return params
        const { videoUrl, videoId, minLikes, format } = params

        const abortController = new AbortController()
        const { signal } = abortController
        const encoder = new TextEncoder()
        const streamState = { closed: false }
        const stream = new ReadableStream({
          async start(controller) {
            const closeStream = () => {
              if (streamState.closed) return
              streamState.closed = true
              controller.close()
            }

            const sendEvent = (event: string, data: unknown) => {
              if (streamState.closed) return
              controller.enqueue(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
              )
            }

            const abort = () => abortController.abort()
            if (req.signal.aborted) abort()
            req.signal.addEventListener('abort', abort, { once: true })
            signal.addEventListener('abort', closeStream, { once: true })

            sendEvent('status', { message: 'Starting download...' })

            const result = await downloadComments(videoUrl, {
              minLikes,
              onProgress(processed, filtered) {
                sendEvent('progress', { processed, filtered })
              },
              signal,
            })

            if (result.error) {
              if (!signal.aborted) {
                sendEvent('error', { message: result.error })
              }
              closeStream()
              return
            }

            const filename = buildDownloadFilename(result.videoTitle, videoId, format)
            const payload = buildStreamPayload(format, result.comments, filename)
            sendEvent('complete', {
              count: result.comments.length,
              ...payload,
            })

            closeStream()
          },
          cancel() {
            abortController.abort()
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      },
    },
  },
})

console.log(`Server running at http://localhost:${server.port}`)
