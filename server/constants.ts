export const DEFAULT_DOWNLOAD_FORMAT = 'csv'
export const FALLBACK_FILENAME_PREFIX = 'yt_'
export const STREAM_ENCODING_TEXT = 'utf-8'
export const STREAM_ENCODING_BASE64 = 'base64'
export const FORMAT_QUERY_PARAM = 'format'
export const STREAM_IDLE_TIMEOUT_SECONDS = 120
const DEFAULT_SERVER_PORT = 3000

export function resolveServerPort(envPort: string | undefined): number {
  const parsedPort = Number.parseInt(envPort ?? '', 10)
  return Number.isNaN(parsedPort) ? DEFAULT_SERVER_PORT : parsedPort
}

export const SERVER_PORT = resolveServerPort(process.env.PORT)
