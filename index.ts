import index from './index.html'
import {
  handleCommentsRequest,
  handleCommentsStreamRequest,
} from './server/handlers.ts'
import { SERVER_PORT, STREAM_IDLE_TIMEOUT_SECONDS } from './server/constants.ts'

const mainJsPath = new URL('./main.js', import.meta.url).pathname

const server = Bun.serve({
  port: SERVER_PORT,
  idleTimeout: STREAM_IDLE_TIMEOUT_SECONDS,
  routes: {
    '/': index,
    '/main.js': () =>
      new Response(Bun.file(mainJsPath), {headers: { 'Content-Type': 'text/javascript' },}),
    '/api/comments': { GET: handleCommentsRequest },
    '/api/comments/stream': { GET: handleCommentsStreamRequest },
  },
})

console.log(`Server running at http://localhost:${server.port}`)
