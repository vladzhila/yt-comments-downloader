import { STORAGE_KEYS, THEMES, FORMAT_LABELS } from './constants.js'

export function loadPreferences() {
  const minLikes = localStorage.getItem(STORAGE_KEYS.minLikes)
  const format = localStorage.getItem(STORAGE_KEYS.format)
  const theme = localStorage.getItem(STORAGE_KEYS.theme)

  return {
    minLikes,
    format: format && format in FORMAT_LABELS ? format : null,
    theme: theme && THEMES.has(theme) ? theme : null,
  }
}

export function saveMinLikes(value) {
  localStorage.setItem(STORAGE_KEYS.minLikes, value)
}

export function saveFormat(value) {
  localStorage.setItem(STORAGE_KEYS.format, value)
}

export function saveTheme(value) {
  localStorage.setItem(STORAGE_KEYS.theme, value)
}
