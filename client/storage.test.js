import { expect, test, describe, beforeEach } from 'bun:test'
import { Window as HappyWindow } from 'happy-dom'
import { STORAGE_KEYS } from './constants.js'

const happyWindow = new HappyWindow()
globalThis.localStorage = happyWindow.localStorage

const { loadPreferences, saveMinLikes, saveFormat, saveTheme } =
  await import('./storage.js')

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadPreferences', () => {
    test('returns null for all values when localStorage is empty', () => {
      const prefs = loadPreferences()

      expect(prefs.minLikes).toBeNull()
      expect(prefs.format).toBeNull()
      expect(prefs.theme).toBeNull()
    })

    test('loads minLikes from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.minLikes, '42')

      const prefs = loadPreferences()

      expect(prefs.minLikes).toBe('42')
    })

    test('loads valid format from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.format, 'json')

      const prefs = loadPreferences()

      expect(prefs.format).toBe('json')
    })

    test('returns null for invalid format', () => {
      localStorage.setItem(STORAGE_KEYS.format, 'invalid-format')

      const prefs = loadPreferences()

      expect(prefs.format).toBeNull()
    })

    test('loads valid theme from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.theme, 'dark')

      const prefs = loadPreferences()

      expect(prefs.theme).toBe('dark')
    })

    test('returns null for invalid theme', () => {
      localStorage.setItem(STORAGE_KEYS.theme, 'rainbow')

      const prefs = loadPreferences()

      expect(prefs.theme).toBeNull()
    })
  })

  describe('saveMinLikes', () => {
    test('saves value to localStorage', () => {
      saveMinLikes('100')

      expect(localStorage.getItem(STORAGE_KEYS.minLikes)).toBe('100')
    })
  })

  describe('saveFormat', () => {
    test('saves value to localStorage', () => {
      saveFormat('xlsx')

      expect(localStorage.getItem(STORAGE_KEYS.format)).toBe('xlsx')
    })
  })

  describe('saveTheme', () => {
    test('saves value to localStorage', () => {
      saveTheme('light')

      expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('light')
    })
  })
})
