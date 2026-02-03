const urlInput = document.getElementById('url')
const minLikesInput = document.getElementById('minLikes')
const formatSelect = document.getElementById('format')
const themeSelect = document.getElementById('theme')
const themePill = document.querySelector('.theme-pill')
const downloadBtn = document.getElementById('download')
const statusDiv = document.getElementById('status')
const MIN_LIKES_STORAGE_KEY = 'yt-comments:minLikes'
const FORMAT_STORAGE_KEY = 'yt-comments:format'
const THEME_STORAGE_KEY = 'yt-comments:theme'
const THEMES = new Set(['system', 'light', 'dark'])
const FORMAT_LABELS = {
  csv: 'CSV',
  json: 'JSON',
  xlsx: 'XLSX',
  md: 'Markdown',
}
const INVALID_URL_MESSAGE = 'Enter a valid YouTube URL'
const REQUIRED_URL_MESSAGE = 'Enter a YouTube URL'
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
]
const downloadState = { active: false }

const savedMinLikes = localStorage.getItem(MIN_LIKES_STORAGE_KEY)
if (savedMinLikes !== null) {
  minLikesInput.value = savedMinLikes
}

const savedFormat = localStorage.getItem(FORMAT_STORAGE_KEY)
if (savedFormat && savedFormat in FORMAT_LABELS) {
  formatSelect.value = savedFormat
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
if (savedTheme && THEMES.has(savedTheme)) {
  themeSelect.value = savedTheme
}

function updateDownloadLabel() {
  const label = FORMAT_LABELS[formatSelect.value] ?? FORMAT_LABELS.csv
  downloadBtn.textContent = `Download ${label}`
}

function updateDownloadEnabled() {
  downloadBtn.disabled = downloadState.active || !urlInput.value.trim()
}

function applyTheme(theme, skipTransition = false) {
  if (skipTransition) {
    document.body.classList.add('no-transition')
  }

  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }

  if (skipTransition) {
    document.body.offsetHeight
    document.body.classList.remove('no-transition')
  }
}

function setDownloadActive(active) {
  downloadState.active = active
  updateDownloadEnabled()
}

function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  Array.from(binary).forEach((char, index) => {
    bytes[index] = char.charCodeAt(0)
  })
  return bytes
}

function createDownloadBlob(payload) {
  if (payload.encoding === 'base64') {
    const bytes = base64ToUint8Array(payload.data)
    return new Blob([bytes], { type: payload.mimeType })
  }
  return new Blob([payload.data], { type: payload.mimeType })
}

function isLikelyVideoId(value) {
  return value.length === 11 && !value.includes('/')
}

function isValidYouTubeUrl(value) {
  if (isLikelyVideoId(value)) {
    return true
  }
  return YOUTUBE_PATTERNS.some((pattern) => pattern.test(value))
}

function setStatus(type, message, count) {
  statusDiv.className = `status visible ${type}`
  statusDiv.innerHTML =
    count !== undefined
      ? `<span class="status-text">${message}</span><span class="status-count">${count} comments</span>`
      : `<span class="status-text">${message}</span>`
}

async function downloadComments() {
  const url = urlInput.value.trim()
  const minLikes = parseInt(minLikesInput.value, 10) || 0
  const format = formatSelect.value

  if (!url) {
    setStatus('error', REQUIRED_URL_MESSAGE)
    return
  }

  if (!isValidYouTubeUrl(url)) {
    setStatus('error', INVALID_URL_MESSAGE)
    return
  }

  setDownloadActive(true)
  setStatus('loading', 'Connecting...')

  try {
    const params = new URLSearchParams({
      url,
      minLikes: String(minLikes),
      format,
    })
    const eventSource = new EventSource(`/api/comments/stream?${params}`)

    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data)
      setStatus('loading', data.message)
    })

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data)
      setStatus('loading', `Scanning...`, data.filtered)
    })

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data)
      eventSource.close()

      const blob = createDownloadBlob(data)
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = data.filename
      a.click()
      URL.revokeObjectURL(downloadUrl)

      setStatus('success', 'Download complete', data.count)
      setDownloadActive(false)
    })

    eventSource.addEventListener('error', (e) => {
      if (e.data) {
        const data = JSON.parse(e.data)
        setStatus('error', data.message)
      } else {
        setStatus('error', 'Connection lost')
      }
      eventSource.close()
      setDownloadActive(false)
    })
  } catch {
    setStatus('error', 'Connection failed')
    setDownloadActive(false)
  }
}

downloadBtn.addEventListener('click', downloadComments)
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    downloadComments()
  }
})
urlInput.addEventListener('input', updateDownloadEnabled)
minLikesInput.addEventListener('input', () => {
  localStorage.setItem(MIN_LIKES_STORAGE_KEY, minLikesInput.value)
})
formatSelect.addEventListener('change', () => {
  localStorage.setItem(FORMAT_STORAGE_KEY, formatSelect.value)
  updateDownloadLabel()
})

themeSelect.addEventListener('change', () => {
  localStorage.setItem(THEME_STORAGE_KEY, themeSelect.value)
  applyTheme(themeSelect.value, true)
})

function openThemePicker() {
  if (typeof themeSelect.showPicker === 'function') {
    themeSelect.showPicker()
    return
  }
  themeSelect.focus()
  themeSelect.click()
}

function handleThemePillClick(event) {
  if (event.target === themeSelect) {
    return
  }
  openThemePicker()
}

if (themePill) {
  themePill.addEventListener('click', handleThemePillClick)
}

updateDownloadLabel()
updateDownloadEnabled()
applyTheme(themeSelect.value)
