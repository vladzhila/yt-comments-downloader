export const STORAGE_KEYS = {
  minLikes: 'yt-comments:minLikes',
  format: 'yt-comments:format',
  theme: 'yt-comments:theme',
}

export const THEMES = new Set(['system', 'light', 'dark'])

export const FORMAT_LABELS = {
  csv: 'CSV',
  json: 'JSON',
  xlsx: 'XLSX',
  md: 'Markdown',
}

export const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
]

export const MESSAGES = {
  invalidUrl: 'Enter a valid YouTube URL',
  requiredUrl: 'Enter a YouTube URL',
  connecting: 'Connecting...',
  scanning: 'Scanning...',
  downloadComplete: 'Download complete',
  connectionLost: 'Connection lost',
  connectionFailed: 'Connection failed',
}
