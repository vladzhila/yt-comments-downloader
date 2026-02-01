import { downloadComments } from '../youtube.ts'
import { parseRequestParams } from './params.ts'
import {
  FORMAT_META,
  buildDownloadData,
  buildDownloadFilename,
  buildStreamPayload,
} from './formats.ts'

async function handleCommentsRequest(req: Request): Promise<Response> {
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
}

async function handleCommentsStreamRequest(req: Request): Promise<Response> {
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
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
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
}

export { handleCommentsRequest, handleCommentsStreamRequest }
