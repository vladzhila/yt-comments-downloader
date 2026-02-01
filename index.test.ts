import { expect, test } from 'bun:test'

test('minLikes default is 0 in UI', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toMatch(/id="minLikes"[\s\S]*?value="0"/)
})

test('dark theme styles are defined', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toContain('color-scheme: light dark')
  expect(html).toContain('@media (prefers-color-scheme: dark)')
  expect(html).toContain('--bg: #0f1112')
})

test('minLikes default is 0 in API params', async () => {
  const source = await Bun.file(new URL('./server/params.ts', import.meta.url)).text()
  expect(source).toContain('const DEFAULT_MIN_LIKES = 0')
  expect(source).toContain('String(DEFAULT_MIN_LIKES)')
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

test('invalid YouTube URL message is present', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toContain('Enter a valid YouTube URL')
  expect(html).toContain('function isValidYouTubeUrl')
})

test('format default is CSV in UI', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toMatch(/id="format"[\s\S]*?option value="csv" selected/)
})

test('format choices are listed in UI', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toContain('option value="csv"')
  expect(html).toContain('option value="json"')
  expect(html).toContain('option value="xlsx"')
  expect(html).toContain('option value="md"')
})

test('theme default is system in UI', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toMatch(/id="theme"[\s\S]*?option value="system" selected/)
  expect(html).toContain('option value="light"')
  expect(html).toContain('option value="dark"')
})

test('format is persisted in localStorage', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toContain("const FORMAT_STORAGE_KEY = 'yt-comments:format'")
  expect(html).toMatch(/localStorage\.getItem\(FORMAT_STORAGE_KEY\)/)
  expect(html).toMatch(/localStorage\.setItem\(FORMAT_STORAGE_KEY/)
})

test('theme is persisted in localStorage', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toContain("const THEME_STORAGE_KEY = 'yt-comments:theme'")
  expect(html).toMatch(/localStorage\.getItem\(THEME_STORAGE_KEY\)/)
  expect(html).toMatch(/localStorage\.setItem\(THEME_STORAGE_KEY/)
})

test('download button starts disabled', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toMatch(/id="download"[^>]*disabled/)
})

test('download button toggles on url input', async () => {
  const html = await Bun.file(new URL('./index.html', import.meta.url)).text()
  expect(html).toContain('function updateDownloadEnabled()')
  expect(html).toContain("urlInput.addEventListener('input', updateDownloadEnabled)")
  expect(html).toContain('updateDownloadEnabled()')
})

test('server config sets idleTimeout', async () => {
  const source = await Bun.file(new URL('./index.ts', import.meta.url)).text()
  expect(source).toContain('idleTimeout: STREAM_IDLE_TIMEOUT_SECONDS')
})
