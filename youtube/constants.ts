const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const DEFAULT_YOUTUBE_URL = 'https://www.youtube.com'
const WATCH_PATH = '/watch'
const NEXT_PATH = '/youtubei/v1/next'
const OEMBED_PATH = '/oembed'
const OEMBED_URL_PARAM = 'url'
const OEMBED_FORMAT_PARAM = 'format'
const OEMBED_FORMAT = 'json'
const CONTINUATION_DELAY_MS = 100
const CANCELLED_ERROR_MESSAGE = 'Request cancelled'
const REPLY_PARENT_MARKER = 'reply'
const UNKNOWN_ERROR_MESSAGE = 'Unknown error'
const CLIENT_NAME = 'WEB'
const CLIENT_VERSION = '2.20231219.04.00'
const ACCEPT_LANGUAGE = 'en-US,en;q=0.9'
const TITLE_DEBUG_PREFIX = '[yt-title]'
const TITLE_DEBUG_SNIPPET_LENGTH = 500

const COMMENT_COLUMNS = [
  'published_time',
  'author',
  'likes',
  'comment_id',
  'parent_id',
  'comment',
] as const

const XLSX_SHEET_COMMENTS = 'comments'
const XLSX_SHEET_REPLIES = 'replies'
const JSON_ROOT_KEY = 'comments'

const COMMENT_SECTION_IDS = [
  'comments-section',
  'engagement-panel-comments-section',
  'shorts-engagement-panel-comments-section',
]

export {
  USER_AGENT,
  DEFAULT_YOUTUBE_URL,
  WATCH_PATH,
  NEXT_PATH,
  OEMBED_PATH,
  OEMBED_URL_PARAM,
  OEMBED_FORMAT_PARAM,
  OEMBED_FORMAT,
  CONTINUATION_DELAY_MS,
  CANCELLED_ERROR_MESSAGE,
  REPLY_PARENT_MARKER,
  UNKNOWN_ERROR_MESSAGE,
  CLIENT_NAME,
  CLIENT_VERSION,
  ACCEPT_LANGUAGE,
  TITLE_DEBUG_PREFIX,
  TITLE_DEBUG_SNIPPET_LENGTH,
  COMMENT_COLUMNS,
  XLSX_SHEET_COMMENTS,
  XLSX_SHEET_REPLIES,
  JSON_ROOT_KEY,
  COMMENT_SECTION_IDS,
}
