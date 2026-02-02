import { test, expect, describe } from 'bun:test'
import {
  extractVideoId,
  commentsToCSV,
  commentsToJSON,
  commentsToMarkdown,
  commentsToXlsx,
  downloadComments,
  parseVoteCount,
  decodeHtmlEntities,
  searchDict,
  parseCommentsFromMutations,
  extractApiKey,
  extractVideoTitle,
  CANCELLED_ERROR_MESSAGE,
} from './youtube.ts'
import { findInitialContinuation, getTitleDebugInfo } from './youtube/html.ts'
import type { Comment, Mutation } from './youtube.ts'
import { REPLY_PARENT_MARKER, TITLE_DEBUG_SNIPPET_LENGTH } from './youtube/constants.ts'
import { asCommentId, asVideoId } from './youtube/ids.ts'
import * as XLSX from 'xlsx'

const API_KEY = 'test-api-key'
const VIDEO_OK = 'vid12345678'
const VIDEO_NO_KEY = 'vid12345679'
const VIDEO_NO_CONTINUATION = 'vid12345670'
const VIDEO_FALLBACK = 'vid12345671'
const VIDEO_WATCH_ERROR = 'vid12345672'
const VIDEO_ABORT = 'vid12345673'
const VIDEO_INVALID_JSON = 'vid12345674'
const VIDEO_COMMENTS_ERROR = 'vid12345675'
const VIDEO_OEMBED = 'vid12345676'
const ROOT_TOKEN = 'root-token'
const NEXT_TOKEN = 'next-token'
const REPLY_TOKEN_BUTTON = 'reply-token-button'
const REPLY_TOKEN_DIRECT = 'reply-token-direct'
const FALLBACK_TOKEN = 'fallback-token'
const TITLE_ENCODED = 'Hello &amp; World'
const VIDEO_ID = asVideoId('dQw4w9WgXcQ')
const FIRST_COMMENT_ERROR = 'Expected comment to exist'
const SNIPPET_PADDING = 50

type MutationOptions = {
  id: string
  text?: string
  author?: string
  likes?: string
  time?: string
  replyLevel?: number
}

function createMutation(options: MutationOptions): Mutation {
  const {
    id,
    text = 'Test comment',
    author = 'TestUser',
    likes = '0',
    time = '1 day ago',
    replyLevel = 0,
  } = options

  return {
    payload: {
      commentEntityPayload: {
        key: `comment-${id}`,
        properties: {
          commentId: id,
          content: { content: text },
          publishedTime: time,
          replyLevel,
        },
        author: { displayName: author },
        toolbar: { likeCountNotliked: likes },
      },
    },
  }
}

function createInitialHtml(options: {
  apiKey?: string
  title?: string
  initialData: Record<string, unknown>
}): string {
  const { apiKey, title, initialData } = options
  const titleTag = title ? `<meta property="og:title" content="${title}">` : ''
  const apiKeySnippet = apiKey ? `"INNERTUBE_API_KEY":"${apiKey}"` : ''
  const data = JSON.stringify(initialData)
  return `<html><head>${titleTag}</head><body><script>var ytInitialData = ${data};</script>${apiKeySnippet}</body></html>`
}

function createSortMenuData(tokens: string[]): Record<string, unknown> {
  return {
    sortFilterSubMenuRenderer: {
      subMenuItems: tokens.map((token) => ({
        serviceEndpoint: {
          continuationCommand: { token },
        },
      })),
    },
  }
}

function createContinuationData(token: string): Record<string, unknown> {
  return {
    continuationEndpoint: {
      continuationCommand: { token },
    },
  }
}

function getFirst<T>(items: readonly T[], errorMessage: string): T {
  const [first] = items
  if (first) return first
  throw new Error(errorMessage)
}

function startStubServer(options: {
  htmlByVideoId: Record<string, string>
  responsesByToken: Record<string, unknown>
  apiKey: string
  watchStatusByVideoId?: Record<string, number>
  nextStatusByToken?: Record<string, number>
  oembedTitleByVideoId?: Record<string, string>
}) {
  const {
    htmlByVideoId,
    responsesByToken,
    apiKey,
    watchStatusByVideoId,
    nextStatusByToken,
    oembedTitleByVideoId,
  } = options
  const server = Bun.serve({
    port: 0,
    routes: {
      '/watch': {
        GET(req) {
          const url = new URL(req.url)
          const videoId = url.searchParams.get('v') ?? ''
          const status = watchStatusByVideoId?.[videoId]
          if (status) return new Response('error', { status })
          const html = htmlByVideoId[videoId]
          if (!html) return new Response('not found', { status: 404 })
          return new Response(html, { headers: { 'Content-Type': 'text/html' } })
        },
      },
      '/youtubei/v1/next': {
        async POST(req) {
          const url = new URL(req.url)
          const key = url.searchParams.get('key')
          if (key !== apiKey) return new Response('invalid key', { status: 403 })
          const body = (await req.json()) as { continuation?: string }
          const token = body.continuation ?? ''
          const status = nextStatusByToken?.[token]
          if (status) return new Response('error', { status })
          const payload = responsesByToken[token]
          if (!payload) return new Response('unknown token', { status: 404 })
          return Response.json(payload)
        },
      },
      '/oembed': {
        GET(req) {
          const url = new URL(req.url)
          const videoUrl = url.searchParams.get('url') ?? ''
          if (!videoUrl) return new Response('invalid url', { status: 400 })
          const parsed = new URL(videoUrl)
          const videoId = parsed.searchParams.get('v') ?? extractVideoId(videoUrl)
          if (!videoId) return new Response('invalid url', { status: 400 })
          const title = oembedTitleByVideoId?.[String(videoId)]
          if (!title) return new Response('not found', { status: 404 })
          return Response.json({ title })
        },
      },
    },
  })

  return {
    server,
    baseUrl: `http://localhost:${server.port}`,
  }
}

test('extractVideoId handles direct video ID', () => {
  expect(extractVideoId('dQw4w9WgXcQ')).toBe(VIDEO_ID)
})

test('extractVideoId handles standard watch URL', () => {
  expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(VIDEO_ID)
})

test('extractVideoId handles short URL', () => {
  expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe(VIDEO_ID)
})

test('extractVideoId handles embed URL', () => {
  expect(extractVideoId('https://youtube.com/embed/dQw4w9WgXcQ')).toBe(VIDEO_ID)
})

test('extractVideoId handles shorts URL', () => {
  expect(extractVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe(VIDEO_ID)
})

test('extractVideoId returns null for invalid input', () => {
  expect(extractVideoId('not-a-url')).toBe(null)
  expect(extractVideoId('https://example.com')).toBe(null)
})

test('findInitialContinuation uses first menu item when only one exists', () => {
  const initialData = createSortMenuData([ROOT_TOKEN])
  const html = createInitialHtml({ apiKey: API_KEY, title: TITLE_ENCODED, initialData })
  const endpoint = findInitialContinuation(html)

  expect(endpoint?.continuationCommand?.token).toBe(ROOT_TOKEN)
})

test('commentsToCSV generates valid CSV', () => {
  const comments: Comment[] = [
    {
      cid: asCommentId('abc123'),
      text: 'Great video!',
      author: 'User1',
      votes: 100,
      time: '1 day ago',
    },
    {
      cid: asCommentId('def456'),
      text: 'Test "quotes"',
      author: 'User2',
      votes: 50,
      time: '2 days ago',
      parent: REPLY_PARENT_MARKER,
    },
  ]

  const csv = commentsToCSV(comments)
  const lines = csv.split('\n')

  expect(lines[0]).toBe('published_time,author,likes,comment_id,parent_id,comment')
  expect(lines[1]).toBe('"1 day ago","User1",100,"abc123","","Great video!"')
  expect(lines[2]).toBe('"2 days ago","User2",50,"def456","reply","Test ""quotes"""')
})

test('commentsToCSV handles empty array', () => {
  const csv = commentsToCSV([])
  expect(csv).toBe('published_time,author,likes,comment_id,parent_id,comment')
})

test('commentsToCSV escapes quotes in author name', () => {
  const comments: Comment[] = [
    {
      cid: asCommentId('abc'),
      text: 'Hello',
      author: 'User "Pro"',
      votes: 10,
      time: '1 hour ago',
    },
  ]
  const csv = commentsToCSV(comments)
  expect(csv).toContain('"User ""Pro"""')
})

test('commentsToJSON outputs comments array', () => {
  const comments: Comment[] = [
    {
      cid: asCommentId('c1'),
      text: 'Hello',
      author: 'User1',
      votes: 1,
      time: '1 day ago',
    },
    {
      cid: asCommentId('c2'),
      text: 'Reply',
      author: 'User2',
      votes: 2,
      time: '2 days ago',
      parent: REPLY_PARENT_MARKER,
    },
  ]

  const json = commentsToJSON(comments)
  const parsed = JSON.parse(json) as { comments: Comment[] }

  expect(parsed.comments).toEqual(comments)
})

test('commentsToMarkdown escapes pipes and newlines', () => {
  const comments: Comment[] = [
    {
      cid: asCommentId('c1'),
      text: 'Hello | world\nnext line',
      author: 'User1',
      votes: 1,
      time: '1 day ago',
    },
  ]

  const markdown = commentsToMarkdown(comments)
  expect(markdown).toContain(
    '| published_time | author | likes | comment_id | parent_id | comment |',
  )
  expect(markdown).toContain('Hello \\| world<br>next line')
})

test('commentsToXlsx splits comments and replies', () => {
  const comments: Comment[] = [
    {
      cid: asCommentId('c1'),
      text: 'Top',
      author: 'User1',
      votes: 1,
      time: '1 day ago',
    },
    {
      cid: asCommentId('r1'),
      text: 'Reply',
      author: 'User2',
      votes: 2,
      time: '2 days ago',
      parent: REPLY_PARENT_MARKER,
    },
  ]

  const data = commentsToXlsx(comments)
  const workbook = XLSX.read(data, { type: 'array' })

  expect(workbook.SheetNames).toContain('comments')
  expect(workbook.SheetNames).toContain('replies')

  const commentsSheet = XLSX.utils.sheet_to_json(workbook.Sheets.comments!)
  const repliesSheet = XLSX.utils.sheet_to_json(workbook.Sheets.replies!)

  expect(commentsSheet).toHaveLength(1)
  expect(repliesSheet).toHaveLength(1)
})

describe('downloadComments', () => {
  test('returns error for invalid URL', async () => {
    const result = await downloadComments('not-a-valid-url')
    expect(result.error).toBe('Invalid YouTube URL or video ID')
    expect(result.comments).toEqual([])
  })

  test('returns error for random URL', async () => {
    const result = await downloadComments('https://example.com/foo')
    expect(result.error).toBe('Invalid YouTube URL or video ID')
    expect(result.comments).toEqual([])
  })

  test('downloads and sorts comments from stub server', async () => {
    const initialData = createSortMenuData(['unused-token', ROOT_TOKEN])
    const html = createInitialHtml({
      apiKey: API_KEY,
      title: TITLE_ENCODED,
      initialData,
    })
    const responsesByToken = {
      [ROOT_TOKEN]: {
        frameworkUpdates: {
          entityBatchUpdate: {
            mutations: [
              createMutation({ id: 'c1', likes: '2' }),
              createMutation({ id: 'c2', likes: '5' }),
            ],
          },
        },
        onResponseReceivedEndpoints: [
          {
            appendContinuationItemsAction: {
              targetId: 'comments-section',
              continuationItems: [
                {
                  continuationEndpoint: {
                    continuationCommand: { token: NEXT_TOKEN },
                  },
                },
              ],
            },
          },
          {
            appendContinuationItemsAction: {
              targetId: 'comment-replies-item-1',
              continuationItems: [
                {
                  continuationItemRenderer: { dummy: true },
                  buttonRenderer: {
                    command: {
                      continuationCommand: { token: REPLY_TOKEN_BUTTON },
                    },
                  },
                },
              ],
            },
          },
          {
            reloadContinuationItemsCommand: {
              targetId: 'comment-replies-item-2',
              continuationItems: [
                {
                  continuationEndpoint: {
                    continuationCommand: { token: REPLY_TOKEN_DIRECT },
                  },
                },
              ],
            },
          },
        ],
      },
      [NEXT_TOKEN]: {
        frameworkUpdates: {
          entityBatchUpdate: {
            mutations: [createMutation({ id: 'c3', likes: '10' })],
          },
        },
      },
      [REPLY_TOKEN_BUTTON]: {
        frameworkUpdates: {
          entityBatchUpdate: {
            mutations: [createMutation({ id: 'r1', likes: '7', replyLevel: 1 })],
          },
        },
      },
      [REPLY_TOKEN_DIRECT]: {
        frameworkUpdates: {
          entityBatchUpdate: {
            mutations: [createMutation({ id: 'r2', likes: '3', replyLevel: 2 })],
          },
        },
      },
    }
    const { server, baseUrl } = startStubServer({
      htmlByVideoId: { [VIDEO_OK]: html },
      responsesByToken,
      apiKey: API_KEY,
    })
    const progress: Array<{ processed: number; filtered: number }> = []

    try {
      const result = await downloadComments(VIDEO_OK, {
        minLikes: 3,
        baseUrl: `${baseUrl}/`,
        onProgress(processed, filtered) {
          progress.push({ processed, filtered })
        },
      })

      expect(result.error).toBeUndefined()
      expect(result.videoTitle).toBe('Hello & World')
      expect(result.comments.map((comment) => String(comment.cid))).toEqual([
        'c3',
        'r1',
        'c2',
        'r2',
      ])
      expect(result.comments.find((comment) => comment.cid === asCommentId('r1'))?.parent).toBe(
        REPLY_PARENT_MARKER,
      )
      expect(progress.length).toBeGreaterThan(0)
      const last = progress[progress.length - 1]
      expect(last).toEqual({ processed: 5, filtered: 4 })
    } finally {
      server.stop(true)
    }
  })

  test('falls back to oembed when title missing', async () => {
    const initialData = createSortMenuData([ROOT_TOKEN])
    const html = createInitialHtml({ apiKey: API_KEY, initialData })
    const responsesByToken = {
      [ROOT_TOKEN]: {
        frameworkUpdates: {
          entityBatchUpdate: {
            mutations: [createMutation({ id: 'c6', likes: '1' })],
          },
        },
      },
    }
    const { server, baseUrl } = startStubServer({
      htmlByVideoId: { [VIDEO_OEMBED]: html },
      responsesByToken,
      apiKey: API_KEY,
      oembedTitleByVideoId: { [VIDEO_OEMBED]: 'Oembed Title' },
    })

    try {
      const result = await downloadComments(VIDEO_OEMBED, { minLikes: 0, baseUrl })
      expect(result.error).toBeUndefined()
      expect(result.videoTitle).toBe('Oembed Title')
    } finally {
      server.stop(true)
    }
  })

  test('aborts when signal is cancelled during progress', async () => {
    const controller = new AbortController()
    const initialData = createSortMenuData([ROOT_TOKEN])
    const html = createInitialHtml({ apiKey: API_KEY, title: TITLE_ENCODED, initialData })
    const responsesByToken = {
      [ROOT_TOKEN]: {
        frameworkUpdates: {
          entityBatchUpdate: {
            mutations: [createMutation({ id: 'c5', likes: '1' })],
          },
        },
      },
    }
    const { server, baseUrl } = startStubServer({
      htmlByVideoId: { [VIDEO_ABORT]: html },
      responsesByToken,
      apiKey: API_KEY,
    })

    try {
      const result = await downloadComments(VIDEO_ABORT, {
        baseUrl,
        signal: controller.signal,
        onProgress() {
          controller.abort()
        },
      })
      expect(result.error).toBe(CANCELLED_ERROR_MESSAGE)
      expect(result.comments).toEqual([])
    } finally {
      server.stop(true)
    }
  })

  test('falls back to continuationEndpoint when sort menu missing', async () => {
    const initialData = createContinuationData(FALLBACK_TOKEN)
    const html = createInitialHtml({ apiKey: API_KEY, title: TITLE_ENCODED, initialData })
    const responsesByToken = {
      [FALLBACK_TOKEN]: {
        frameworkUpdates: {
          entityBatchUpdate: {
            mutations: [createMutation({ id: 'c4', likes: '1' })],
          },
        },
      },
    }
    const { server, baseUrl } = startStubServer({
      htmlByVideoId: { [VIDEO_FALLBACK]: html },
      responsesByToken,
      apiKey: API_KEY,
    })

    try {
      const result = await downloadComments(VIDEO_FALLBACK, { minLikes: 0, baseUrl })
      expect(result.error).toBeUndefined()
      expect(result.comments).toHaveLength(1)
      expect(result.comments[0]?.cid).toBe(asCommentId('c4'))
    } finally {
      server.stop(true)
    }
  })

  test('returns error when API key missing', async () => {
    const initialData = createSortMenuData([ROOT_TOKEN])
    const html = createInitialHtml({ title: TITLE_ENCODED, initialData })
    const { server, baseUrl } = startStubServer({
      htmlByVideoId: { [VIDEO_NO_KEY]: html },
      responsesByToken: {},
      apiKey: API_KEY,
    })

    try {
      const result = await downloadComments(VIDEO_NO_KEY, { baseUrl })
      expect(result.error).toBe('Could not extract YouTube data. Video may be unavailable.')
    } finally {
      server.stop(true)
    }
  })

  test('returns error when ytInitialData is invalid', async () => {
    const html = `<html><body><script>var ytInitialData = {broken};</script>"INNERTUBE_API_KEY":"${API_KEY}"</body></html>`
    const { server, baseUrl } = startStubServer({
      htmlByVideoId: { [VIDEO_INVALID_JSON]: html },
      responsesByToken: {},
      apiKey: API_KEY,
    })

    try {
      const result = await downloadComments(VIDEO_INVALID_JSON, { baseUrl })
      expect(result.error).toBe('Could not find comments section. Comments may be disabled.')
    } finally {
      server.stop(true)
    }
  })

  test('returns error when comments section missing', async () => {
    const initialData = { foo: 'bar' }
    const html = createInitialHtml({ apiKey: API_KEY, title: TITLE_ENCODED, initialData })
    const { server, baseUrl } = startStubServer({
      htmlByVideoId: { [VIDEO_NO_CONTINUATION]: html },
      responsesByToken: {},
      apiKey: API_KEY,
    })

    try {
      const result = await downloadComments(VIDEO_NO_CONTINUATION, { baseUrl })
      expect(result.error).toBe('Could not find comments section. Comments may be disabled.')
    } finally {
      server.stop(true)
    }
  })

  test('returns error when watch page fails', async () => {
    const { server, baseUrl } = startStubServer({
      htmlByVideoId: {},
      responsesByToken: {},
      apiKey: API_KEY,
      watchStatusByVideoId: { [VIDEO_WATCH_ERROR]: 500 },
    })

    try {
      const result = await downloadComments(VIDEO_WATCH_ERROR, { baseUrl })
      expect(result.error).toBe('Failed to fetch video page: 500')
    } finally {
      server.stop(true)
    }
  })

  test('returns error when comment fetch fails', async () => {
    const initialData = createSortMenuData([ROOT_TOKEN])
    const html = createInitialHtml({ apiKey: API_KEY, title: TITLE_ENCODED, initialData })
    const { server, baseUrl } = startStubServer({
      htmlByVideoId: { [VIDEO_COMMENTS_ERROR]: html },
      responsesByToken: {},
      apiKey: API_KEY,
      nextStatusByToken: { [ROOT_TOKEN]: 500 },
    })

    try {
      const result = await downloadComments(VIDEO_COMMENTS_ERROR, { baseUrl })
      expect(result.error).toBe('Failed to fetch comments: 500')
    } finally {
      server.stop(true)
    }
  })

  test('returns cancellation error when aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await downloadComments('dQw4w9WgXcQ', { signal: controller.signal })
    expect(result.error).toBe(CANCELLED_ERROR_MESSAGE)
    expect(result.comments).toEqual([])
  })
})

describe('parseVoteCount', () => {
  test('parses plain numbers', () => {
    expect(parseVoteCount('123')).toBe(123)
    expect(parseVoteCount('0')).toBe(0)
    expect(parseVoteCount('1')).toBe(1)
  })

  test('parses K suffix', () => {
    expect(parseVoteCount('1K')).toBe(1000)
    expect(parseVoteCount('1.5K')).toBe(1500)
    expect(parseVoteCount('12.3k')).toBe(12300)
  })

  test('parses M suffix', () => {
    expect(parseVoteCount('1M')).toBe(1000000)
    expect(parseVoteCount('2.5M')).toBe(2500000)
    expect(parseVoteCount('1.2m')).toBe(1200000)
  })

  test('handles commas and spaces', () => {
    expect(parseVoteCount('1,234')).toBe(1234)
    expect(parseVoteCount('1 234')).toBe(1234)
  })

  test('returns 0 for undefined/empty', () => {
    expect(parseVoteCount(undefined)).toBe(0)
    expect(parseVoteCount('')).toBe(0)
  })

  test('returns 0 for non-numeric', () => {
    expect(parseVoteCount('abc')).toBe(0)
  })
})

describe('decodeHtmlEntities', () => {
  test('decodes common entities', () => {
    expect(decodeHtmlEntities('&amp;')).toBe('&')
    expect(decodeHtmlEntities('&lt;')).toBe('<')
    expect(decodeHtmlEntities('&gt;')).toBe('>')
    expect(decodeHtmlEntities('&quot;')).toBe('"')
    expect(decodeHtmlEntities('&#39;')).toBe("'")
  })

  test('decodes hex entities', () => {
    expect(decodeHtmlEntities('&#x26;')).toBe('&')
    expect(decodeHtmlEntities('&#x3C;')).toBe('<')
    expect(decodeHtmlEntities('&#x2019;')).toBe('\u2019')
  })

  test('decodes decimal entities', () => {
    expect(decodeHtmlEntities('&#38;')).toBe('&')
    expect(decodeHtmlEntities('&#60;')).toBe('<')
    expect(decodeHtmlEntities('&#8217;')).toBe('\u2019')
  })

  test('decodes mixed content', () => {
    expect(decodeHtmlEntities('Hello &amp; goodbye')).toBe('Hello & goodbye')
    expect(decodeHtmlEntities('&lt;script&gt;')).toBe('<script>')
  })

  test('preserves plain text', () => {
    expect(decodeHtmlEntities('Hello world')).toBe('Hello world')
  })
})

describe('searchDict', () => {
  test('finds key in flat object', () => {
    const obj = { foo: 'bar', baz: 123 }
    expect([...searchDict(obj, 'foo')]).toEqual(['bar'])
  })

  test('finds key in nested object', () => {
    const obj = { a: { b: { target: 'found' } } }
    expect([...searchDict(obj, 'target')]).toEqual(['found'])
  })

  test('finds multiple occurrences', () => {
    const obj = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }
    const results = [...searchDict(obj, 'id')]
    expect(results.sort()).toEqual([1, 2, 3])
  })

  test('finds in arrays', () => {
    const obj = [{ key: 'a' }, { key: 'b' }]
    const results = [...searchDict(obj, 'key')]
    expect(results.sort()).toEqual(['a', 'b'])
  })

  test('returns empty for missing key', () => {
    const obj = { foo: 'bar' }
    expect([...searchDict(obj, 'missing')]).toEqual([])
  })

  test('handles null/undefined', () => {
    expect([...searchDict(null, 'key')]).toEqual([])
    expect([...searchDict(undefined, 'key')]).toEqual([])
  })
})

describe('parseCommentsFromMutations', () => {
  const makeMutation = (
    overrides: Partial<{
      commentId: string
      content: string
      publishedTime: string
      displayName: string
      likeCount: string
      replyLevel: number
    }> = {},
  ): Mutation => ({
    payload: {
      commentEntityPayload: {
        key: 'comment-key',
        properties: {
          commentId: overrides.commentId ?? 'cid123',
          content: { content: overrides.content ?? 'Test comment' },
          publishedTime: overrides.publishedTime ?? '1 day ago',
          replyLevel: overrides.replyLevel ?? 0,
        },
        author: { displayName: overrides.displayName ?? 'TestUser' },
        toolbar: { likeCountNotliked: overrides.likeCount ?? '10' },
      },
    },
  })

  test('parses valid mutation', () => {
    const mutations = [makeMutation()]
    const comments = parseCommentsFromMutations(mutations, 0)

    expect(comments).toHaveLength(1)
    expect(comments[0]).toEqual({
      cid: asCommentId('cid123'),
      text: 'Test comment',
      author: 'TestUser',
      votes: 10,
      time: '1 day ago',
      parent: undefined,
    })
  })

  test('filters by minLikes', () => {
    const mutations = [
      makeMutation({ likeCount: '5' }),
      makeMutation({ commentId: 'cid2', likeCount: '15' }),
    ]
    const comments = parseCommentsFromMutations(mutations, 10)

    expect(comments).toHaveLength(1)
    const comment = getFirst(comments, FIRST_COMMENT_ERROR)
    expect(comment.cid).toBe(asCommentId('cid2'))
  })

  test('marks replies with parent field', () => {
    const mutations = [makeMutation({ replyLevel: 1 })]
    const comments = parseCommentsFromMutations(mutations, 0)

    const comment = getFirst(comments, FIRST_COMMENT_ERROR)
    expect(comment.parent).toBe(REPLY_PARENT_MARKER)
  })

  test('skips mutations without payload', () => {
    const mutations: Mutation[] = [{ entityKey: 'no-payload' }]
    const comments = parseCommentsFromMutations(mutations, 0)

    expect(comments).toHaveLength(0)
  })

  test('skips mutations without commentId', () => {
    const mutations: Mutation[] = [
      {
        payload: {
          commentEntityPayload: {
            key: 'key',
            properties: { content: { content: 'text' } },
          },
        },
      },
    ]
    const comments = parseCommentsFromMutations(mutations, 0)

    expect(comments).toHaveLength(0)
  })

  test('uses Unknown for missing author', () => {
    const mutations: Mutation[] = [
      {
        payload: {
          commentEntityPayload: {
            key: 'key',
            properties: {
              commentId: 'cid',
              content: { content: 'text' },
            },
          },
        },
      },
    ]
    const comments = parseCommentsFromMutations(mutations, 0)

    const comment = getFirst(comments, FIRST_COMMENT_ERROR)
    expect(comment.author).toBe('Unknown')
  })
})

describe('extractApiKey', () => {
  test('extracts API key from HTML', () => {
    const html = 'var config = {"INNERTUBE_API_KEY":"AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"};'
    expect(extractApiKey(html)).toBe('AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8')
  })

  test('returns null when not found', () => {
    const html = '<html><body>No API key here</body></html>'
    expect(extractApiKey(html)).toBe(null)
  })
})

describe('extractVideoTitle', () => {
  test('extracts from og:title', () => {
    const html = '<meta property="og:title" content="My Video Title">'
    expect(extractVideoTitle(html)).toBe('My Video Title')
  })

  test('extracts from meta itemprop name', () => {
    const html = '<meta itemprop="name" content="Itemprop Title">'
    expect(extractVideoTitle(html)).toBe('Itemprop Title')
  })

  test('extracts from meta name title', () => {
    const html = '<meta name="title" content="Meta Title">'
    expect(extractVideoTitle(html)).toBe('Meta Title')
  })

  test('extracts from player response', () => {
    const html =
      '<script>var ytInitialPlayerResponse = {"videoDetails":{"title":"Player Title"}};</script>'
    expect(extractVideoTitle(html)).toBe('Player Title')
  })

  test('extracts from title tag', () => {
    const html = '<title>My Video Title - YouTube</title>'
    expect(extractVideoTitle(html)).toBe('My Video Title')
  })

  test('decodes HTML entities in title', () => {
    const html = '<meta property="og:title" content="Tom &amp; Jerry">'
    expect(extractVideoTitle(html)).toBe('Tom & Jerry')
  })

  test('returns null when not found', () => {
    const html = '<html><body>No title</body></html>'
    expect(extractVideoTitle(html)).toBe(null)
  })

  test('returns null when title is only YouTube suffix', () => {
    const html = '<title> - YouTube</title>'
    expect(extractVideoTitle(html)).toBe(null)
  })
})

describe('getTitleDebugInfo', function () {
  test('reports title sources and markers', function () {
    const head =
      '<head><meta property="og:title" content="OG">' +
      '<meta itemprop="name" content="Item">' +
      '<meta name="title" content="Meta">' +
      '<title>Title - YouTube</title></head>'
    const html =
      `<html>${head}<body>consent.youtube.com captcha unusual traffic` +
      '<script>var ytInitialData = {};</script>' +
      '<script>var ytInitialPlayerResponse = {"videoDetails":{"title":"Player"}};</script>' +
      '</body></html>'

    const info = getTitleDebugInfo(html)

    expect(info.hasOgTitle).toBe(true)
    expect(info.hasMetaItempropName).toBe(true)
    expect(info.hasMetaNameTitle).toBe(true)
    expect(info.hasTitleTag).toBe(true)
    expect(info.hasPlayerResponse).toBe(true)
    expect(info.hasInitialData).toBe(true)
    expect(info.markers.consent).toBe(true)
    expect(info.markers.captcha).toBe(true)
    expect(info.markers.bot).toBe(true)
    expect(info.snippet.startsWith('<head>')).toBe(true)
  })

  test('limits snippet length', function () {
    const longHead = `<head>${'a'.repeat(TITLE_DEBUG_SNIPPET_LENGTH + SNIPPET_PADDING)}</head>`
    const html = `<html>${longHead}<body></body></html>`
    const info = getTitleDebugInfo(html)

    expect(info.snippet.length).toBe(TITLE_DEBUG_SNIPPET_LENGTH)
  })
})
