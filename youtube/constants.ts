export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const DEFAULT_YOUTUBE_URL = 'https://www.youtube.com'
export const WATCH_PATH = '/watch'
export const NEXT_PATH = '/youtubei/v1/next'
export const OEMBED_PATH = '/oembed'
export const OEMBED_URL_PARAM = 'url'
export const OEMBED_FORMAT_PARAM = 'format'
export const OEMBED_FORMAT = 'json'
export const CONTINUATION_DELAY_MS = 100
export const CANCELLED_ERROR_MESSAGE = 'Request cancelled'
export const REPLY_PARENT_MARKER = 'reply'
export const UNKNOWN_ERROR_MESSAGE = 'Unknown error'
export const CLIENT_NAME = 'WEB'
export const CLIENT_VERSION = '2.20231219.04.00'
export const ACCEPT_LANGUAGE = 'en-US,en;q=0.9'

export const COMMENT_COLUMNS = [
  'published_time',
  'author',
  'likes',
  'comment_id',
  'parent_id',
  'comment',
] as const

export const XLSX_SHEET_COMMENTS = 'comments'
export const XLSX_SHEET_REPLIES = 'replies'
export const JSON_ROOT_KEY = 'comments'

export const COMMENT_SECTION_IDS = [
  'comments-section',
  'engagement-panel-comments-section',
  'shorts-engagement-panel-comments-section',
]

export const COMMENT_SECTION_ID_SET = new Set(COMMENT_SECTION_IDS)
