import { FORMAT_LABELS } from './constants.js'

export function getElements() {
  return {
    urlInput: document.getElementById('url'),
    minLikesInput: document.getElementById('minLikes'),
    formatSelect: document.getElementById('format'),
    themeSelect: document.getElementById('theme'),
    themePill: document.querySelector('.theme-pill'),
    downloadBtn: document.getElementById('download'),
    statusDiv: document.getElementById('status'),
  }
}

export function setStatus(statusDiv, type, message, count) {
  statusDiv.className = `status visible ${type}`
  statusDiv.innerHTML =
    count !== undefined
      ? `<span class="status-text">${message}</span><span class="status-count">${count} comments</span>`
      : `<span class="status-text">${message}</span>`
}

export function updateDownloadLabel(btn, format) {
  const label = FORMAT_LABELS[format] ?? FORMAT_LABELS.csv
  btn.textContent = `Download ${label}`
}

export function updateDownloadEnabled(btn, active, urlValue) {
  btn.disabled = active || !urlValue.trim()
}
