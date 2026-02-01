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
        const minLikes = parseInt(url.searchParams.get('minLikes') ?? '3', 10)

        if (!videoUrl) {
          return Response.json({ error: 'Missing url parameter' }, { status: 400 })
        }

        const videoId = extractVideoId(videoUrl)
        if (!videoId) {
          return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 })
        }

        const result = await downloadComments(videoUrl, { minLikes })

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
        const minLikes = parseInt(url.searchParams.get('minLikes') ?? '3', 10)

        if (!videoUrl) {
          return Response.json({ error: 'Missing url parameter' }, { status: 400 })
        }

        const videoId = extractVideoId(videoUrl)
        if (!videoId) {
          return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 })
        }

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            const sendEvent = (event: string, data: unknown) => {
              controller.enqueue(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
              )
            }

            sendEvent('status', { message: 'Starting download...' })

            const result = await downloadComments(videoUrl, {
              minLikes,
              onProgress(processed, filtered) {
                sendEvent('progress', { processed, filtered })
              },
            })

            if (result.error) {
              sendEvent('error', { message: result.error })
            } else {
              const csv = commentsToCSV(result.comments)
              const baseName = result.videoTitle
                ? sanitizeFilename(result.videoTitle)
                : `yt_${videoId}`
              sendEvent('complete', {
                count: result.comments.length,
                csv,
                filename: `${baseName}.csv`,
              })
            }

            controller.close()
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
