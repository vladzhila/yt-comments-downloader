import { expect, test, describe, beforeEach } from 'bun:test'
import { Window as HappyWindow } from 'happy-dom'

const happyWindow = new HappyWindow()
globalThis.document = happyWindow.document

const { applyTheme } = await import('./theme.js')

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.body.classList.remove('no-transition')
  })

  test('removes data-theme attribute for system theme', () => {
    document.documentElement.setAttribute('data-theme', 'dark')

    applyTheme('system')

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  test('sets data-theme to light', () => {
    applyTheme('light')

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('sets data-theme to dark', () => {
    applyTheme('dark')

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('adds no-transition class when skipTransition is true', () => {
    applyTheme('dark', true)

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('switches from light to dark', () => {
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
