import index from './index.html'
import { downloadComments, commentsToCSV, extractVideoId } from './youtube.ts'

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

const server = Bun.serve({
  port: 3000,
  routes: {
    '/': index,

    '/api/comments': {
      async GET(req) {
        const url = new URL(req.url)
        const videoUrl = url.searchParams.get('url')
        const minLikes = parseInt(url.searchParams.get('minLikes') ?? '0', 10)

        if (!videoUrl) {
          return Response.json({ error: 'Missing url parameter' }, { status: 400 })
        }

        const videoId = extractVideoId(videoUrl)
        if (!videoId) {
          return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 })
        }

        const result = await downloadComments(videoUrl, { minLikes, signal: req.signal })

        if (result.error) {
          return Response.json({ error: result.error }, { status: 500 })
        }

        const csv = commentsToCSV(result.comments)
        const baseName = result.videoTitle ? sanitizeFilename(result.videoTitle) : `yt_${videoId}`
        const filename = `${baseName}.csv`

        return new Response(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      },
    },

    '/api/comments/stream': {
      async GET(req) {
        const url = new URL(req.url)
        const videoUrl = url.searchParams.get('url')
        const minLikes = parseInt(url.searchParams.get('minLikes') ?? '0', 10)

        if (!videoUrl) {
          return Response.json({ error: 'Missing url parameter' }, { status: 400 })
        }

        const videoId = extractVideoId(videoUrl)
        if (!videoId) {
          return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 })
        }

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

            const csv = commentsToCSV(result.comments)
            const baseName = result.videoTitle
              ? sanitizeFilename(result.videoTitle)
              : `yt_${videoId}`
            sendEvent('complete', {
              count: result.comments.length,
              csv,
              filename: `${baseName}.csv`,
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
