import { test, expect, describe } from 'bun:test'
import {
  extractVideoId,
  commentsToCSV,
  downloadComments,
  parseVoteCount,
  decodeHtmlEntities,
  searchDict,
  parseCommentsFromMutations,
  extractApiKey,
  extractVideoTitle,
} from './youtube.ts'
import type { Comment, Mutation } from './youtube.ts'

test('extractVideoId handles direct video ID', () => {
  expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extractVideoId handles standard watch URL', () => {
  expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extractVideoId handles short URL', () => {
  expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extractVideoId handles embed URL', () => {
  expect(extractVideoId('https://youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extractVideoId handles shorts URL', () => {
  expect(extractVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extractVideoId returns null for invalid input', () => {
  expect(extractVideoId('not-a-url')).toBe(null)
  expect(extractVideoId('https://example.com')).toBe(null)
})

test('commentsToCSV generates valid CSV', () => {
  const comments: Comment[] = [
    {
      cid: 'abc123',
      text: 'Great video!',
      author: 'User1',
      votes: 100,
      time: '1 day ago',
    },
    {
      cid: 'def456',
      text: 'Test "quotes"',
      author: 'User2',
      votes: 50,
      time: '2 days ago',
      parent: 'abc123',
    },
  ]

  const csv = commentsToCSV(comments)
  const lines = csv.split('\n')

  expect(lines[0]).toBe('published_time,author,likes,comment_id,parent_id,comment')
  expect(lines[1]).toBe('"1 day ago","User1",100,"abc123","","Great video!"')
  expect(lines[2]).toBe('"2 days ago","User2",50,"def456","abc123","Test ""quotes"""')
})

test('commentsToCSV handles empty array', () => {
  const csv = commentsToCSV([])
  expect(csv).toBe('published_time,author,likes,comment_id,parent_id,comment')
})

test('commentsToCSV escapes quotes in author name', () => {
  const comments: Comment[] = [
    {
      cid: 'abc',
      text: 'Hello',
      author: 'User "Pro"',
      votes: 10,
      time: '1 hour ago',
    },
  ]
  const csv = commentsToCSV(comments)
  expect(csv).toContain('"User ""Pro"""')
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
      cid: 'cid123',
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
    expect(comments[0]!.cid).toBe('cid2')
  })

  test('marks replies with parent field', () => {
    const mutations = [makeMutation({ replyLevel: 1 })]
    const comments = parseCommentsFromMutations(mutations, 0)

    expect(comments[0]!.parent).toBe('reply')
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

    expect(comments[0]!.author).toBe('Unknown')
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
})
