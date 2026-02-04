import { expect, test, describe } from 'bun:test'
import { isLikelyVideoId, isValidYouTubeUrl } from './validation.js'

describe('isLikelyVideoId', () => {
  test('returns true for 11 character string without slash', () => {
    expect(isLikelyVideoId('dQw4w9WgXcQ')).toBe(true)
    expect(isLikelyVideoId('abc123XYZ_-')).toBe(true)
  })

  test('returns false for strings not exactly 11 characters', () => {
    expect(isLikelyVideoId('short')).toBe(false)
    expect(isLikelyVideoId('waytoolongstring')).toBe(false)
    expect(isLikelyVideoId('')).toBe(false)
  })

  test('returns false for 11 character string with slash', () => {
    expect(isLikelyVideoId('abc/1234567')).toBe(false)
  })
})

describe('isValidYouTubeUrl', () => {
  test('accepts bare video ID', () => {
    expect(isValidYouTubeUrl('dQw4w9WgXcQ')).toBe(true)
  })

  test('accepts youtube.com/watch URLs', () => {
    expect(
      isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe(true)
    expect(isValidYouTubeUrl('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      true,
    )
    expect(isValidYouTubeUrl('youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
  })

  test('accepts youtu.be short URLs', () => {
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    expect(isValidYouTubeUrl('youtu.be/dQw4w9WgXcQ')).toBe(true)
  })

  test('accepts embed URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      true,
    )
  })

  test('accepts shorts URLs', () => {
    expect(
      isValidYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
    ).toBe(true)
  })

  test('accepts /v/ URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe(
      true,
    )
  })

  test('rejects invalid URLs', () => {
    expect(isValidYouTubeUrl('https://vimeo.com/123456789')).toBe(false)
    expect(isValidYouTubeUrl('not a url')).toBe(false)
    expect(isValidYouTubeUrl('')).toBe(false)
    expect(isValidYouTubeUrl('youtube.com/watch?v=short')).toBe(false)
  })
})
