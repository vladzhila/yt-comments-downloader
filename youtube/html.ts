import { Result } from 'neverthrow'
import { asVideoId } from './ids.ts'
import type { ContinuationEndpoint, SortFilterSubMenuRenderer, VideoId } from './types.ts'
import { searchDict } from './parse.ts'

const VIDEO_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
] as const

const INITIAL_DATA_PATTERN = /var ytInitialData = ({.+?});/
const OG_TITLE_PATTERN = /<meta property="og:title" content="([^"]+)"/
const TITLE_TAG_PATTERN = /<title>([^<]+)<\/title>/
const TITLE_SUFFIX_PATTERN = / - YouTube$/
const API_KEY_PATTERN = /"INNERTUBE_API_KEY":"([^"]+)"/
const VIDEO_ID_LENGTH = 11

function extractVideoId(urlOrId: string): VideoId | null {
  if (urlOrId.length === VIDEO_ID_LENGTH && !urlOrId.includes('/')) {
    return asVideoId(urlOrId)
  }

  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = urlOrId.match(pattern)
    if (match?.[1]) return asVideoId(match[1])
  }

  return null
}

function extractApiKey(html: string): string | null {
  const match = html.match(API_KEY_PATTERN)
  return match?.[1] ?? null
}

function extractVideoTitle(html: string): string | null {
  const ogMatch = html.match(OG_TITLE_PATTERN)
  if (ogMatch?.[1]) return decodeHtmlEntities(ogMatch[1])

  const titleMatch = html.match(TITLE_TAG_PATTERN)
  if (titleMatch?.[1]) {
    const title = titleMatch[1].replace(TITLE_SUFFIX_PATTERN, '')
    return decodeHtmlEntities(title)
  }

  return null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
}

const safeJsonParse = Result.fromThrowable(
  (str: string) => JSON.parse(str) as unknown,
  () => null,
)

function parseJson(value: string): unknown | null {
  const result = safeJsonParse(value)
  return result.isOk() ? result.value : null
}

function findInitialContinuation(html: string): ContinuationEndpoint | null {
  const match = html.match(INITIAL_DATA_PATTERN)
  if (!match?.[1]) return null

  const data = parseJson(match[1])
  if (!data) return null

  const sortMenus = [
    ...searchDict(data, 'sortFilterSubMenuRenderer'),
  ] as SortFilterSubMenuRenderer[]
  for (const menu of sortMenus) {
    const items = menu.subMenuItems ?? []
    if (items.length > 1 && items[1]?.serviceEndpoint) {
      return items[1].serviceEndpoint
    }
    if (items.length > 0 && items[0]?.serviceEndpoint) {
      return items[0].serviceEndpoint
    }
  }

  const continuationEndpoints = [
    ...searchDict(data, 'continuationEndpoint'),
  ] as ContinuationEndpoint[]
  for (const ep of continuationEndpoints) {
    if (ep.continuationCommand?.token) {
      return ep
    }
  }

  return null
}

export {
  extractVideoId,
  extractApiKey,
  extractVideoTitle,
  decodeHtmlEntities,
  findInitialContinuation,
}
