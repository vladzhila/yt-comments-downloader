import { expect, test, describe, beforeEach } from 'bun:test'
import { Window as HappyWindow } from 'happy-dom'

const happyWindow = new HappyWindow()
globalThis.document = happyWindow.document

describe('ui', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="url" type="text" />
      <input id="minLikes" type="number" value="0" />
      <select id="format"><option value="csv">CSV</option></select>
      <select id="theme"><option value="system">System</option></select>
      <div class="theme-pill"></div>
      <button id="download">Download CSV</button>
      <div id="status"></div>
    `
  })

  describe('getElements', async () => {
    const { getElements } = await import('./ui.js')

    test('returns all DOM element references', () => {
      const elements = getElements()

      expect(elements.urlInput).toBe(document.getElementById('url'))
      expect(elements.minLikesInput).toBe(document.getElementById('minLikes'))
      expect(elements.formatSelect).toBe(document.getElementById('format'))
      expect(elements.themeSelect).toBe(document.getElementById('theme'))
      expect(elements.themePill).toBe(document.querySelector('.theme-pill'))
      expect(elements.downloadBtn).toBe(document.getElementById('download'))
      expect(elements.statusDiv).toBe(document.getElementById('status'))
    })
  })

  describe('setStatus', async () => {
    const { setStatus } = await import('./ui.js')

    test('sets status class and message', () => {
      const statusDiv = document.getElementById('status')

      setStatus(statusDiv, 'loading', 'Connecting...')

      expect(statusDiv.className).toBe('status visible loading')
      expect(statusDiv.textContent).toContain('Connecting...')
    })

    test('includes count when provided', () => {
      const statusDiv = document.getElementById('status')

      setStatus(statusDiv, 'success', 'Download complete', 42)

      expect(statusDiv.className).toBe('status visible success')
      expect(statusDiv.textContent).toContain('Download complete')
      expect(statusDiv.textContent).toContain('42 comments')
    })

    test('sets error status', () => {
      const statusDiv = document.getElementById('status')

      setStatus(statusDiv, 'error', 'Something went wrong')

      expect(statusDiv.className).toBe('status visible error')
      expect(statusDiv.textContent).toContain('Something went wrong')
    })
  })

  describe('updateDownloadLabel', async () => {
    const { updateDownloadLabel } = await import('./ui.js')

    test('updates button text for CSV format', () => {
      const btn = document.getElementById('download')

      updateDownloadLabel(btn, 'csv')

      expect(btn.textContent).toBe('Download CSV')
    })

    test('updates button text for JSON format', () => {
      const btn = document.getElementById('download')

      updateDownloadLabel(btn, 'json')

      expect(btn.textContent).toBe('Download JSON')
    })

    test('updates button text for XLSX format', () => {
      const btn = document.getElementById('download')

      updateDownloadLabel(btn, 'xlsx')

      expect(btn.textContent).toBe('Download XLSX')
    })

    test('updates button text for Markdown format', () => {
      const btn = document.getElementById('download')

      updateDownloadLabel(btn, 'md')

      expect(btn.textContent).toBe('Download Markdown')
    })

    test('defaults to CSV for unknown format', () => {
      const btn = document.getElementById('download')

      updateDownloadLabel(btn, 'unknown')

      expect(btn.textContent).toBe('Download CSV')
    })
  })

  describe('updateDownloadEnabled', async () => {
    const { updateDownloadEnabled } = await import('./ui.js')

    test('disables button when download is active', () => {
      const btn = document.getElementById('download')

      updateDownloadEnabled(btn, true, 'https://youtube.com/watch?v=abc')

      expect(btn.disabled).toBe(true)
    })

    test('disables button when URL is empty', () => {
      const btn = document.getElementById('download')

      updateDownloadEnabled(btn, false, '')

      expect(btn.disabled).toBe(true)
    })

    test('disables button when URL is whitespace only', () => {
      const btn = document.getElementById('download')

      updateDownloadEnabled(btn, false, '   ')

      expect(btn.disabled).toBe(true)
    })

    test('enables button when not active and URL has value', () => {
      const btn = document.getElementById('download')
      btn.disabled = true

      updateDownloadEnabled(btn, false, 'https://youtube.com/watch?v=abc')

      expect(btn.disabled).toBe(false)
    })
  })
})
