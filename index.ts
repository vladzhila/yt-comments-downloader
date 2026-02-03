import index from './index.html'
import {
  handleCommentsRequest,
  handleCommentsStreamRequest,
} from './server/handlers.ts'
import { SERVER_PORT, STREAM_IDLE_TIMEOUT_SECONDS } from './server/constants.ts'

const server = Bun.serve({
  port: SERVER_PORT,
  idleTimeout: STREAM_IDLE_TIMEOUT_SECONDS,
  routes: {
    '/': index,
    '/api/comments': { GET: handleCommentsRequest },
    '/api/comments/stream': { GET: handleCommentsStreamRequest },
  },
})

console.log(`Server running at http://localhost:${server.port}`)
