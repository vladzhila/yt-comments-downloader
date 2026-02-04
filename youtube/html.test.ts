import { expect, test } from 'bun:test'
import { asVideoId } from './ids.ts'
import {
  decodeHtmlEntities,
  extractApiKey,
  extractVideoId,
  extractVideoTitle,
  findInitialContinuation,
} from './html.ts'

test('extractVideoId handles watch URL', () => {
  const id = extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  expect(id).toBe(asVideoId('dQw4w9WgXcQ'))
})

test('extractVideoId handles short URL', () => {
  const id = extractVideoId('https://youtu.be/dQw4w9WgXcQ')
  expect(id).toBe(asVideoId('dQw4w9WgXcQ'))
})

test('extractVideoId handles embed URL', () => {
  const id = extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')
  expect(id).toBe(asVideoId('dQw4w9WgXcQ'))
})

test('extractVideoId handles v/ URL', () => {
  const id = extractVideoId('https://www.youtube.com/v/dQw4w9WgXcQ')
  expect(id).toBe(asVideoId('dQw4w9WgXcQ'))
})

test('extractVideoId handles shorts URL', () => {
  const id = extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')
  expect(id).toBe(asVideoId('dQw4w9WgXcQ'))
})

test('extractVideoId handles bare 11-char ID', () => {
  const id = extractVideoId('dQw4w9WgXcQ')
  expect(id).toBe(asVideoId('dQw4w9WgXcQ'))
})

test('extractVideoId returns null for invalid URL', () => {
  expect(extractVideoId('https://example.com')).toBeNull()
  expect(extractVideoId('invalid')).toBeNull()
  expect(extractVideoId('')).toBeNull()
})

test('extractApiKey extracts key from HTML', () => {
  const html = 'blah "INNERTUBE_API_KEY":"AIzaSyD123abc" blah'
  expect(extractApiKey(html)).toBe('AIzaSyD123abc')
})

test('extractApiKey returns null when key missing', () => {
  expect(extractApiKey('<html></html>')).toBeNull()
})

test('extractVideoTitle extracts from og:title', () => {
  const html = '<meta property="og:title" content="Test Video Title">'
  expect(extractVideoTitle(html)).toBe('Test Video Title')
})

test('extractVideoTitle extracts from itemprop name', () => {
  const html = '<meta itemprop="name" content="Itemprop Title">'
  expect(extractVideoTitle(html)).toBe('Itemprop Title')
})

test('extractVideoTitle extracts from meta name title', () => {
  const html = '<meta name="title" content="Meta Title">'
  expect(extractVideoTitle(html)).toBe('Meta Title')
})

test('extractVideoTitle extracts from player response', () => {
  const html = `ytInitialPlayerResponse = {"videoDetails":{"title":"Player Title"}};`
  expect(extractVideoTitle(html)).toBe('Player Title')
})

test('extractVideoTitle extracts from title tag', () => {
  const html = '<title>Video Name - YouTube</title>'
  expect(extractVideoTitle(html)).toBe('Video Name')
})

test('extractVideoTitle returns null when no title found', () => {
  expect(extractVideoTitle('<html></html>')).toBeNull()
})

test('extractVideoTitle decodes HTML entities', () => {
  const html = '<meta property="og:title" content="Test &amp; Title">'
  expect(extractVideoTitle(html)).toBe('Test & Title')
})

test('decodeHtmlEntities decodes named entities', () => {
  expect(decodeHtmlEntities('&amp;&lt;&gt;&quot;&#39;')).toBe('&<>"\'')
})

test('decodeHtmlEntities decodes numeric entities', () => {
  expect(decodeHtmlEntities('&#65;&#66;&#67;')).toBe('ABC')
})

test('decodeHtmlEntities decodes hex entities', () => {
  expect(decodeHtmlEntities('&#x41;&#x42;&#x43;')).toBe('ABC')
})

test('findInitialContinuation extracts from sort menu', () => {
  const data = {
    contents: {
      twoColumnWatchNextResults: {
        results: {
          results: {
            contents: [
              {
                itemSectionRenderer: {
                  sectionIdentifier: 'comment-item-section',
                  contents: [
                    {
                      commentsEntryPointHeaderRenderer: {
                        sortFilterSubMenuRenderer: {
                          subMenuItems: [
                            {
                              title: 'Top',
                              serviceEndpoint: {continuationCommand: { token: 'token1' },},
                            },
                            {
                              title: 'Newest',
                              serviceEndpoint: {continuationCommand: { token: 'token2' },},
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  }
  const html = `var ytInitialData = ${JSON.stringify(data)};`
  const endpoint = findInitialContinuation(html)
  expect(endpoint?.continuationCommand?.token).toBe('token2')
})

test('findInitialContinuation falls back to continuationEndpoint', () => {
  const data = {
    contents: {
      twoColumnWatchNextResults: {
        results: {
          results: {
            contents: [
              {itemSectionRenderer: {continuationEndpoint: {continuationCommand: { token: 'fallback-token' },},},},
            ],
          },
        },
      },
    },
  }
  const html = `var ytInitialData = ${JSON.stringify(data)};`
  const endpoint = findInitialContinuation(html)
  expect(endpoint?.continuationCommand?.token).toBe('fallback-token')
})

test('findInitialContinuation returns null when no data', () => {
  expect(findInitialContinuation('<html></html>')).toBeNull()
})

test('findInitialContinuation returns null for invalid JSON', () => {
  const html = 'var ytInitialData = {invalid json};'
  expect(findInitialContinuation(html)).toBeNull()
})
