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
  statusDiv.textContent = ''

  const textSpan = document.createElement('span')
  textSpan.className = 'status-text'
  textSpan.textContent = message
  statusDiv.appendChild(textSpan)

  if (count !== undefined) {
    const countSpan = document.createElement('span')
    countSpan.className = 'status-count'
    countSpan.textContent = `${count} comments`
    statusDiv.appendChild(countSpan)
  }
}

export function updateDownloadLabel(btn, format) {
  const label = FORMAT_LABELS[format] ?? FORMAT_LABELS.csv
  btn.textContent = `Download ${label}`
}

export function updateDownloadEnabled(btn, active, urlValue) {
  btn.disabled = active || !urlValue.trim()
}
