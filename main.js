import { downloadComments } from './client/download.js'
import {
  loadPreferences,
  saveMinLikes,
  saveFormat,
  saveTheme,
} from './client/storage.js'
import { applyTheme, handleThemePillClick } from './client/theme.js'
import {
  getElements,
  setStatus,
  updateDownloadLabel,
  updateDownloadEnabled,
} from './client/ui.js'

const elements = getElements()
const {
  urlInput,
  minLikesInput,
  formatSelect,
  themeSelect,
  themePill,
  downloadBtn,
  statusDiv,
} = elements

const downloadState = { active: false }

function setDownloadActive(active) {
  downloadState.active = active
  updateDownloadEnabled(downloadBtn, downloadState.active, urlInput.value)
}

function setStatusUi(type, message, count) {
  setStatus(statusDiv, type, message, count)
}

function handleDownload() {
  downloadComments({
    url: urlInput.value.trim(),
    minLikes: parseInt(minLikesInput.value, 10) || 0,
    format: formatSelect.value,
    setStatus: setStatusUi,
    setDownloadActive,
  })
}

function handleUrlKeydown(event) {
  if (event.key !== 'Enter') {
    return
  }
  handleDownload()
}

function handleUrlInput() {
  updateDownloadEnabled(downloadBtn, downloadState.active, urlInput.value)
}

function handleMinLikesInput() {
  saveMinLikes(minLikesInput.value)
}

function handleFormatChange() {
  saveFormat(formatSelect.value)
  updateDownloadLabel(downloadBtn, formatSelect.value)
}

function handleThemeChange() {
  saveTheme(themeSelect.value)
  applyTheme(themeSelect.value, true)
}

function handleThemePill(event) {
  handleThemePillClick(event, themeSelect)
}

const prefs = loadPreferences()
if (prefs.minLikes !== null) {
  minLikesInput.value = prefs.minLikes
}
if (prefs.format !== null) {
  formatSelect.value = prefs.format
}
if (prefs.theme !== null) {
  themeSelect.value = prefs.theme
}

downloadBtn.addEventListener('click', handleDownload)

urlInput.addEventListener('keydown', handleUrlKeydown)
urlInput.addEventListener('input', handleUrlInput)

minLikesInput.addEventListener('input', handleMinLikesInput)

formatSelect.addEventListener('change', handleFormatChange)

themeSelect.addEventListener('change', handleThemeChange)

if (themePill) {
  themePill.addEventListener('click', handleThemePill)
}

updateDownloadLabel(downloadBtn, formatSelect.value)
updateDownloadEnabled(downloadBtn, downloadState.active, urlInput.value)
applyTheme(themeSelect.value)
