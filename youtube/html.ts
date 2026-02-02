import { Result } from 'neverthrow'
import { TITLE_DEBUG_SNIPPET_LENGTH } from './constants.ts'
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
const PLAYER_RESPONSE_PATTERN = /ytInitialPlayerResponse\s*=\s*({.+?});/
const OG_TITLE_PATTERN = /<meta property="og:title" content="([^"]+)"/
const META_ITEMPROP_NAME_PATTERN = /<meta itemprop="name" content="([^"]+)"/
const META_NAME_TITLE_PATTERN = /<meta name="title" content="([^"]+)"/
const TITLE_TAG_PATTERN = /<title>([^<]+)<\/title>/
const TITLE_SUFFIX_PATTERN = / - YouTube$/
const API_KEY_PATTERN = /"INNERTUBE_API_KEY":"([^"]+)"/
const VIDEO_ID_LENGTH = 11
const HEAD_PATTERN = /<head[^>]*>[\s\S]*?<\/head>/i
const CONSENT_MARKER = 'consent.youtube.com'
const CAPTCHA_MARKER = 'captcha'
const BOT_MARKER = 'unusual traffic'

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

function extractTitleFromMeta(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern)
  if (!match?.[1]) return null
  return decodeHtmlEntities(match[1])
}

function extractTitleFromPlayerResponse(html: string): string | null {
  const match = html.match(PLAYER_RESPONSE_PATTERN)
  if (!match?.[1]) return null

  const data = parseJson(match[1])
  if (!data || typeof data !== 'object') return null

  const videoDetails = (data as { videoDetails?: unknown }).videoDetails
  if (!videoDetails || typeof videoDetails !== 'object') return null

  const title = (videoDetails as { title?: unknown }).title
  if (typeof title !== 'string') return null

  return decodeHtmlEntities(title)
}

type TitleDebugInfo = {
  htmlLength: number
  hasOgTitle: boolean
  hasMetaItempropName: boolean
  hasMetaNameTitle: boolean
  hasTitleTag: boolean
  hasPlayerResponse: boolean
  hasInitialData: boolean
  markers: {
    consent: boolean
    captcha: boolean
    bot: boolean
  }
  snippet: string
}

function getTitleDebugInfo(html: string): TitleDebugInfo {
  const headMatch = html.match(HEAD_PATTERN)
  const snippetSource = headMatch?.[0] ?? html
  const snippet = snippetSource.slice(0, TITLE_DEBUG_SNIPPET_LENGTH)
  const lower = html.toLowerCase()

  return {
    htmlLength: html.length,
    hasOgTitle: OG_TITLE_PATTERN.test(html),
    hasMetaItempropName: META_ITEMPROP_NAME_PATTERN.test(html),
    hasMetaNameTitle: META_NAME_TITLE_PATTERN.test(html),
    hasTitleTag: TITLE_TAG_PATTERN.test(html),
    hasPlayerResponse: PLAYER_RESPONSE_PATTERN.test(html),
    hasInitialData: INITIAL_DATA_PATTERN.test(html),
    markers: {
      consent: lower.includes(CONSENT_MARKER),
      captcha: lower.includes(CAPTCHA_MARKER),
      bot: lower.includes(BOT_MARKER),
    },
    snippet,
  }
}

function extractVideoTitle(html: string): string | null {
  const ogTitle = extractTitleFromMeta(html, OG_TITLE_PATTERN)
  if (ogTitle) return ogTitle

  const itempropTitle = extractTitleFromMeta(html, META_ITEMPROP_NAME_PATTERN)
  if (itempropTitle) return itempropTitle

  const metaTitle = extractTitleFromMeta(html, META_NAME_TITLE_PATTERN)
  if (metaTitle) return metaTitle

  const playerTitle = extractTitleFromPlayerResponse(html)
  if (playerTitle) return playerTitle

  const titleMatch = html.match(TITLE_TAG_PATTERN)
  if (!titleMatch?.[1]) return null
  const title = titleMatch[1].replace(TITLE_SUFFIX_PATTERN, '').trim()
  return title ? decodeHtmlEntities(title) : null
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
  getTitleDebugInfo,
  decodeHtmlEntities,
  findInitialContinuation,
}
