import index from './index.html'
import {
  handleCommentsRequest,
  handleCommentsStreamRequest,
} from './server/handlers.ts'
import {
  SERVER_PORT,
  STREAM_IDLE_TIMEOUT_SECONDS,
  SECURITY_HEADERS,
} from './server/constants.ts'

const mainJsPath = new URL('./main.js', import.meta.url).pathname

function addSecurityHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

const server = Bun.serve({
  port: SERVER_PORT,
  idleTimeout: STREAM_IDLE_TIMEOUT_SECONDS,
  routes: {
    '/': index,
    '/main.js': () =>
      addSecurityHeaders(
        new Response(Bun.file(mainJsPath), {headers: { 'Content-Type': 'text/javascript' },}),
      ),
    '/api/comments': {GET: async (req) => addSecurityHeaders(await handleCommentsRequest(req)),},
    '/api/comments/stream': {
      GET: async (req) =>
        addSecurityHeaders(await handleCommentsStreamRequest(req)),
    },
  },
})

console.log(`Server running at http://localhost:${server.port}`)
