const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const YOUTUBE_URL = 'https://www.youtube.com'

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

async function fetchPage(videoId: string): Promise<string> {
  const url = `${YOUTUBE_URL}/watch?v=${videoId}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
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
  apiKey: string,
  initialEndpoint: ContinuationEndpoint,
  minLikes: number,
  onProgress?: (count: number, filtered: number) => void,
): Promise<Comment[]> {
  const comments: Comment[] = []
  const continuations: ContinuationEndpoint[] = [initialEndpoint]
  let totalProcessed = 0

  while (continuations.length > 0) {
    const continuation = continuations.pop()!
    const token = continuation.continuationCommand?.token
    if (!token) continue

    const response = await fetch(`${YOUTUBE_URL}/youtubei/v1/next?key=${apiKey}`, {
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
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.status}`)
    }

    const data = (await response.json()) as ContinuationResponse
    const mutations = data.frameworkUpdates?.entityBatchUpdate?.mutations ?? []
    const batchComments = parseCommentsFromMutations(mutations, minLikes)
    comments.push(...batchComments)
    totalProcessed += mutations.length

    if (onProgress && mutations.length > 0) {
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

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return comments
}

interface DownloadOptions {
  minLikes?: number
  onProgress?: (processed: number, filtered: number) => void
}

export async function downloadComments(
  urlOrId: string,
  options: DownloadOptions = {},
): Promise<CommentResult> {
  const { minLikes = 3, onProgress } = options
  const videoId = extractVideoId(urlOrId)
  if (!videoId) {
    return { comments: [], error: 'Invalid YouTube URL or video ID' }
  }

  try {
    const html = await fetchPage(videoId)
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

    const comments = await fetchComments(apiKey, initialEndpoint, minLikes, onProgress)
    const sorted = comments.sort((a, b) => b.votes - a.votes)

    return { comments: sorted, videoTitle: videoTitle ?? undefined }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { comments: [], error: message }
  }
}

export function commentsToCSV(comments: readonly Comment[]): string {
  const header = 'published_time,author,likes,comment_id,parent_id,comment'
  const rows = comments.map((c) => {
    const text = c.text.replace(/"/g, '""')
    const author = c.author.replace(/"/g, '""')
    return `"${c.time}","${author}",${c.votes},"${c.cid}","${c.parent ?? ''}","${text}"`
  })
  return [header, ...rows].join('\n')
}

export {
  extractVideoId,
  parseVoteCount,
  decodeHtmlEntities,
  searchDict,
  parseCommentsFromMutations,
  extractApiKey,
  extractVideoTitle,
}
export type { Comment, Mutation }
