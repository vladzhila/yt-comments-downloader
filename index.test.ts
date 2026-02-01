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
