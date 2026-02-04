import { createDownloadBlob } from './download/blob.js'
import { MESSAGES } from './constants.js'
import { isValidYouTubeUrl } from './validation.js'

const EVENT_STATUS = 'status'
const EVENT_PROGRESS = 'progress'
const EVENT_COMPLETE = 'complete'
const EVENT_ERROR = 'error'
const STATUS_ERROR = 'error'
const STATUS_LOADING = 'loading'
const STATUS_SUCCESS = 'success'

export function downloadComments({
  url,
  minLikes,
  format,
  setStatus,
  setDownloadActive,
}) {
  if (!url) {
    setStatus(STATUS_ERROR, MESSAGES.requiredUrl)
    return
  }

  if (!isValidYouTubeUrl(url)) {
    setStatus(STATUS_ERROR, MESSAGES.invalidUrl)
    return
  }

  setDownloadActive(true)
  setStatus(STATUS_LOADING, MESSAGES.connecting)

  try {
    const params = new URLSearchParams({
      url,
      minLikes: String(minLikes),
      format,
    })
    const eventSource = new EventSource(`/api/comments/stream?${params}`)

    eventSource.addEventListener(EVENT_STATUS, function handleStatus(e) {
      const data = JSON.parse(e.data)
      setStatus(STATUS_LOADING, data.message)
    })

    eventSource.addEventListener(EVENT_PROGRESS, function handleProgress(e) {
      const data = JSON.parse(e.data)
      setStatus(STATUS_LOADING, MESSAGES.scanning, data.filtered)
    })

    eventSource.addEventListener(EVENT_COMPLETE, function handleComplete(e) {
      const data = JSON.parse(e.data)
      eventSource.close()

      const blob = createDownloadBlob(data)
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = data.filename
      a.click()
      URL.revokeObjectURL(downloadUrl)

      setStatus(STATUS_SUCCESS, MESSAGES.downloadComplete, data.count)
      setDownloadActive(false)
    })

    eventSource.addEventListener(EVENT_ERROR, function handleError(e) {
      if (e.data) {
        const data = JSON.parse(e.data)
        setStatus(STATUS_ERROR, data.message)
        eventSource.close()
        setDownloadActive(false)
        return
      }
      setStatus(STATUS_ERROR, MESSAGES.connectionLost)
      eventSource.close()
      setDownloadActive(false)
    })
  } catch {
    setStatus(STATUS_ERROR, MESSAGES.connectionFailed)
    setDownloadActive(false)
  }
}
