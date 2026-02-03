import {
  commentsToCSV,
  commentsToJSON,
  commentsToMarkdown,
  commentsToXlsx,
} from '../youtube.ts'
import type { Comment, VideoId } from '../youtube/types.ts'
import {
  DEFAULT_DOWNLOAD_FORMAT,
  FALLBACK_FILENAME_PREFIX,
  STREAM_ENCODING_BASE64,
  STREAM_ENCODING_TEXT,
} from './constants.ts'

const MAX_FILENAME_LENGTH = 200

type FormatMeta = {
  extension: string
  mimeType: string
}

export const FORMAT_META = {
  csv: {
    extension: 'csv',
    mimeType: 'text/csv; charset=utf-8',
  },
  json: {
    extension: 'json',
    mimeType: 'application/json; charset=utf-8',
  },
  xlsx: {
    extension: 'xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  md: {
    extension: 'md',
    mimeType: 'text/markdown; charset=utf-8',
  },
} as const satisfies Record<string, FormatMeta>

export type DownloadFormat = keyof typeof FORMAT_META
type StreamEncoding =
  | typeof STREAM_ENCODING_TEXT
  | typeof STREAM_ENCODING_BASE64

const FORMAT_BUILDERS = {
  csv: commentsToCSV,
  json: commentsToJSON,
  md: commentsToMarkdown,
  xlsx: commentsToXlsx,
} satisfies Record<
  DownloadFormat,
  (comments: readonly Comment[]) => string | Uint8Array
>

export type StreamPayload = {
  data: string
  encoding: StreamEncoding
  filename: string
  mimeType: string
}

function isDownloadFormat(value: string): value is DownloadFormat {
  return Object.hasOwn(FORMAT_META, value)
}

export function parseDownloadFormat(value: string | null): DownloadFormat {
  if (!value) {
    return DEFAULT_DOWNLOAD_FORMAT
  }
  return isDownloadFormat(value) ? value : DEFAULT_DOWNLOAD_FORMAT
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FILENAME_LENGTH)
}

export function buildDownloadFilename(
  videoTitle: string | undefined,
  videoId: VideoId,
  format: DownloadFormat,
): string {
  const baseName = videoTitle
    ? sanitizeFilename(videoTitle)
    : `${FALLBACK_FILENAME_PREFIX}${videoId}`
  return `${baseName}.${FORMAT_META[format].extension}`
}

export function buildDownloadData(
  format: DownloadFormat,
  comments: readonly Comment[],
): string | Uint8Array {
  return FORMAT_BUILDERS[format](comments)
}

export function buildStreamPayload(
  format: DownloadFormat,
  comments: readonly Comment[],
  filename: string,
): StreamPayload {
  const data = buildDownloadData(format, comments)
  const mimeType = FORMAT_META[format].mimeType

  if (typeof data === 'string') {
    return {
      data,
      encoding: STREAM_ENCODING_TEXT,
      filename,
      mimeType,
    }
  }

  const base64 = Buffer.from(data).toString('base64')
  return {
    data: base64,
    encoding: STREAM_ENCODING_BASE64,
    filename,
    mimeType,
  }
}
