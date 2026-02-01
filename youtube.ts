import * as XLSX from 'xlsx'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const DEFAULT_YOUTUBE_URL = 'https://www.youtube.com'
const WATCH_PATH = '/watch'
const NEXT_PATH = '/youtubei/v1/next'
const CONTINUATION_DELAY_MS = 100
const ABORT_ERROR_NAME = 'AbortError'
const CANCELLED_ERROR_MESSAGE = 'Request cancelled'

interface Comment {
  cid: string
  text: string
  author: string
  votes: number
  time: string
  parent?: string
}

interface CommentResult {
  comments: Comment[]
  videoTitle?: string
  error?: string
}

const COMMENT_COLUMNS = [
  'published_time',
  'author',
  'likes',
  'comment_id',
  'parent_id',
  'comment',
] as const

const XLSX_SHEET_COMMENTS = 'comments'
const XLSX_SHEET_REPLIES = 'replies'
const JSON_ROOT_KEY = 'comments'

type CommentColumn = (typeof COMMENT_COLUMNS)[number]
type CommentRow = Record<CommentColumn, string | number>

interface CommentEntityPayload {
  key: string
  properties?: {
    commentId?: string
    content?: { content?: string }
    publishedTime?: string
    replyLevel?: number
  }
  author?: {
    displayName?: string
  }
  toolbar?: {
    likeCountNotliked?: string
  }
}

interface Mutation {
  payload?: {
    commentEntityPayload?: CommentEntityPayload
  }
  entityKey?: string
}

interface ContinuationEndpoint {
  continuationCommand?: {
    token?: string
  }
  commandMetadata?: {
    webCommandMetadata?: {
      apiUrl?: string
    }
  }
}

interface ContinuationAction {
  targetId?: string
  continuationItems?: unknown[]
}

interface ContinuationResponse {
  onResponseReceivedEndpoints?: Array<{
    reloadContinuationItemsCommand?: ContinuationAction
    appendContinuationItemsAction?: ContinuationAction
  }>
  frameworkUpdates?: {
    entityBatchUpdate?: {
      mutations?: Mutation[]
    }
  }
}

function extractVideoId(urlOrId: string): string | null {
  if (urlOrId.length === 11 && !urlOrId.includes('/')) {
    return urlOrId
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

function createAbortError(): Error {
  const err = new Error(CANCELLED_ERROR_MESSAGE)
  err.name = ABORT_ERROR_NAME
  return err
}

function abortIfNeeded(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  throw createAbortError()
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === ABORT_ERROR_NAME
}

function normalizeBaseUrl(url: string): string {
  if (!url.endsWith('/')) return url
  return url.slice(0, -1)
}

async function fetchPage(baseUrl: string, videoId: string, signal?: AbortSignal): Promise<string> {
  const url = `${baseUrl}${WATCH_PATH}?v=${videoId}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch video page: ${response.status}`)
  }

  return response.text()
}

function extractApiKey(html: string): string | null {
  const match = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)
  return match?.[1] ?? null
}

function extractVideoTitle(html: string): string | null {
  const ogMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
  if (ogMatch?.[1]) return decodeHtmlEntities(ogMatch[1])

  const titleMatch = html.match(/<title>([^<]+)<\/title>/)
  if (titleMatch?.[1]) {
    const title = titleMatch[1].replace(/ - YouTube$/, '')
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

interface SortMenuItem {
  serviceEndpoint?: ContinuationEndpoint
}

interface SortFilterSubMenuRenderer {
  subMenuItems?: SortMenuItem[]
}

function findInitialContinuation(html: string): ContinuationEndpoint | null {
  const match = html.match(/var ytInitialData = ({.+?});/)
  if (!match?.[1]) return null

  let data: unknown
  try {
    data = JSON.parse(match[1])
  } catch {
    return null
  }

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

function* searchDict(obj: unknown, searchKey: string): Generator<unknown> {
  const stack: unknown[] = [obj]
  while (stack.length > 0) {
    const current = stack.pop()
    if (current && typeof current === 'object') {
      if (Array.isArray(current)) {
        stack.push(...current)
      } else {
        for (const [key, value] of Object.entries(current)) {
          if (key === searchKey) yield value
          else stack.push(value)
        }
      }
    }
  }
}

function parseVoteCount(text: string | undefined): number {
  if (!text) return 0
  const cleaned = text.replace(/[,\s]/g, '').toLowerCase()
  if (cleaned.endsWith('k')) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000)
  }
  if (cleaned.endsWith('m')) {
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000000)
  }
  return parseInt(cleaned, 10) || 0
}

function parseCommentsFromMutations(mutations: Mutation[], minLikes: number): Comment[] {
  const comments: Comment[] = []

  for (const mutation of mutations) {
    const payload = mutation.payload?.commentEntityPayload
    if (!payload) continue

    const props = payload.properties
    if (!props?.commentId || !props.content?.content) continue

    const votes = parseVoteCount(payload.toolbar?.likeCountNotliked)
    if (votes < minLikes) continue

    comments.push({
      cid: props.commentId,
      text: props.content.content,
      author: payload.author?.displayName ?? 'Unknown',
      votes,
      time: props.publishedTime ?? '',
      parent: props.replyLevel && props.replyLevel > 0 ? 'reply' : undefined,
    })
  }

  return comments
}

const COMMENT_SECTION_IDS = [
  'comments-section',
  'engagement-panel-comments-section',
  'shorts-engagement-panel-comments-section',
]

async function fetchComments(
  baseUrl: string,
  apiKey: string,
  initialEndpoint: ContinuationEndpoint,
  minLikes: number,
  onProgress?: (count: number, filtered: number) => void,
  signal?: AbortSignal,
): Promise<Comment[]> {
  const comments: Comment[] = []
  const continuations: ContinuationEndpoint[] = [initialEndpoint]
  let totalProcessed = 0

  while (continuations.length > 0) {
    abortIfNeeded(signal)
    const continuation = continuations.pop()!
    const token = continuation.continuationCommand?.token
    if (!token) continue

    const response = await fetch(`${baseUrl}${NEXT_PATH}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20231219.04.00',
          },
        },
        continuation: token,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.status}`)
    }

    const data = (await response.json()) as ContinuationResponse
    const mutations = data.frameworkUpdates?.entityBatchUpdate?.mutations ?? []
    const batchComments = parseCommentsFromMutations(mutations, minLikes)
    comments.push(...batchComments)
    totalProcessed += mutations.length

    if (onProgress && mutations.length > 0 && !signal?.aborted) {
      onProgress(totalProcessed, comments.length)
    }

    const reloadActions = [...searchDict(data, 'reloadContinuationItemsCommand')]
    const appendActions = [...searchDict(data, 'appendContinuationItemsAction')]
    const allActions = [...reloadActions, ...appendActions] as ContinuationAction[]

    for (const action of allActions) {
      const targetId = action.targetId ?? ''
      const items = action.continuationItems ?? []

      for (const item of items) {
        if (!item || typeof item !== 'object') continue

        const endpoints = [...searchDict(item, 'continuationEndpoint')] as ContinuationEndpoint[]

        if (COMMENT_SECTION_IDS.includes(targetId)) {
          continuations.unshift(...endpoints)
        } else if (targetId.startsWith('comment-replies-item')) {
          if ('continuationItemRenderer' in item) {
            const buttonRenderers = [...searchDict(item, 'buttonRenderer')] as Array<{
              command?: ContinuationEndpoint
            }>
            for (const btn of buttonRenderers) {
              if (btn.command?.continuationCommand?.token) {
                continuations.push(btn.command)
              }
            }
          } else {
            continuations.unshift(...endpoints)
          }
        }
      }
    }

    abortIfNeeded(signal)
    await new Promise((resolve) => setTimeout(resolve, CONTINUATION_DELAY_MS))
  }

  return comments
}

interface DownloadOptions {
  minLikes?: number
  onProgress?: (processed: number, filtered: number) => void
  signal?: AbortSignal
  baseUrl?: string
}

export async function downloadComments(
  urlOrId: string,
  options: DownloadOptions = {},
): Promise<CommentResult> {
  const { minLikes = 3, onProgress, signal, baseUrl } = options
  const videoId = extractVideoId(urlOrId)
  if (!videoId) {
    return { comments: [], error: 'Invalid YouTube URL or video ID' }
  }

  const resolvedBaseUrl = normalizeBaseUrl(baseUrl ?? DEFAULT_YOUTUBE_URL)

  try {
    const html = await fetchPage(resolvedBaseUrl, videoId, signal)
    const apiKey = extractApiKey(html)
    const videoTitle = extractVideoTitle(html)

    if (!apiKey) {
      return {
        comments: [],
        error: 'Could not extract YouTube data. Video may be unavailable.',
      }
    }

    const initialEndpoint = findInitialContinuation(html)
    if (!initialEndpoint) {
      return {
        comments: [],
        error: 'Could not find comments section. Comments may be disabled.',
      }
    }

    const comments = await fetchComments(
      resolvedBaseUrl,
      apiKey,
      initialEndpoint,
      minLikes,
      onProgress,
      signal,
    )
    const sorted = comments.sort((a, b) => b.votes - a.votes)

    return { comments: sorted, videoTitle: videoTitle ?? undefined }
  } catch (err) {
    if (isAbortError(err)) {
      return { comments: [], error: CANCELLED_ERROR_MESSAGE }
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { comments: [], error: message }
  }
}

function commentToRow(comment: Comment): CommentRow {
  return {
    published_time: comment.time,
    author: comment.author,
    likes: comment.votes,
    comment_id: comment.cid,
    parent_id: comment.parent ?? '',
    comment: comment.text,
  }
}

function escapeCsvField(text: string): string {
  return text.replace(/"/g, '""')
}

function escapeMarkdownCell(value: string | number): string {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

export function commentsToCSV(comments: readonly Comment[]): string {
  const header = COMMENT_COLUMNS.join(',')
  const rows = comments.map((comment) => {
    const row = commentToRow(comment)
    const text = escapeCsvField(String(row.comment))
    const author = escapeCsvField(String(row.author))
    return `"${row.published_time}","${author}",${row.likes},"${row.comment_id}","${row.parent_id}","${text}"`
  })
  return [header, ...rows].join('\n')
}

export function commentsToJSON(comments: readonly Comment[]): string {
  return JSON.stringify({ [JSON_ROOT_KEY]: comments })
}

export function commentsToMarkdown(comments: readonly Comment[]): string {
  const header = `| ${COMMENT_COLUMNS.join(' | ')} |`
  const divider = `| ${COMMENT_COLUMNS.map(() => '---').join(' | ')} |`
  const rows = comments.map((comment) => {
    const row = commentToRow(comment)
    const cells = COMMENT_COLUMNS.map((column) => escapeMarkdownCell(row[column]))
    return `| ${cells.join(' | ')} |`
  })
  return [header, divider, ...rows].join('\n')
}

export function commentsToXlsx(comments: readonly Comment[]): Uint8Array {
  const rows = comments.map(commentToRow)
  const commentsSheet = XLSX.utils.json_to_sheet(rows.filter((row) => !row.parent_id))
  const repliesSheet = XLSX.utils.json_to_sheet(rows.filter((row) => row.parent_id))
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, commentsSheet, XLSX_SHEET_COMMENTS)
  XLSX.utils.book_append_sheet(workbook, repliesSheet, XLSX_SHEET_REPLIES)

  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Uint8Array(data)
}

export {
  CANCELLED_ERROR_MESSAGE,
  extractVideoId,
  parseVoteCount,
  decodeHtmlEntities,
  searchDict,
  parseCommentsFromMutations,
  extractApiKey,
  extractVideoTitle,
}
export type { Comment, Mutation }
