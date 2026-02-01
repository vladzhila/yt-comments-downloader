import { expect, test } from 'bun:test'

test('minLikes default is 0 in UI', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toMatch(/id="minLikes"[\s\S]*?value="0"/)
})

test('minLikes default is 0 in API routes', async () => {
  const source = await Bun.file(new URL('./index.ts', import.meta.url)).text()
  const matches = source.match(/minLikes'\)\s*\?\?\s*'0'/g) ?? []
  expect(matches).toHaveLength(2)
})

test('minLikes is persisted in localStorage', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toContain("const MIN_LIKES_STORAGE_KEY = 'yt-comments:minLikes'")
  expect(html).toMatch(/localStorage\.getItem\(MIN_LIKES_STORAGE_KEY\)/)
  expect(html).toMatch(/localStorage\.setItem\(MIN_LIKES_STORAGE_KEY/)
})

test('minLikes helper text explains the filter', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toContain('Only include comments with at least this many likes.')
  expect(html).toContain('0 = all comments.')
})
