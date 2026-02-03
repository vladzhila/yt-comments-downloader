import * as XLSX from 'xlsx'
import {
  COMMENT_COLUMNS,
  JSON_ROOT_KEY,
  XLSX_SHEET_COMMENTS,
  XLSX_SHEET_REPLIES,
} from './constants.ts'
import type { Comment } from './types.ts'

type CommentColumn = (typeof COMMENT_COLUMNS)[number]
type CommentRow = Record<CommentColumn, string | number>

function commentToRow(comment: Comment): CommentRow {
  return {
    published_time: comment.time,
    author: comment.author,
    likes: comment.votes,
    comment_id: comment.cid,
    parent_id: comment.parent ?? '',
    comment: comment.text,
  }
}

function escapeCsvField(text: string): string {
  return text.replace(/"/g, '""')
}

function escapeMarkdownCell(value: string | number): string {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

export function commentsToCSV(comments: readonly Comment[]): string {
  const header = COMMENT_COLUMNS.join(',')
  const rows = comments.map((comment) => {
    const row = commentToRow(comment)
    const text = escapeCsvField(String(row.comment))
    const author = escapeCsvField(String(row.author))
    return `"${row.published_time}","${author}",${row.likes},"${row.comment_id}","${row.parent_id}","${text}"`
  })
  return [header, ...rows].join('\n')
}

export function commentsToJSON(comments: readonly Comment[]): string {
  return JSON.stringify({ [JSON_ROOT_KEY]: comments })
}

export function commentsToMarkdown(comments: readonly Comment[]): string {
  const header = `| ${COMMENT_COLUMNS.join(' | ')} |`
  const divider = `| ${COMMENT_COLUMNS.map(() => '---').join(' | ')} |`
  const rows = comments.map((comment) => {
    const row = commentToRow(comment)
    const cells = COMMENT_COLUMNS.map((column) =>
      escapeMarkdownCell(row[column]),
    )
    return `| ${cells.join(' | ')} |`
  })
  return [header, divider, ...rows].join('\n')
}

export function commentsToXlsx(comments: readonly Comment[]): Uint8Array {
  const rows = comments.map(commentToRow)
  const commentsSheet = XLSX.utils.json_to_sheet(
    rows.filter((row) => !row.parent_id),
  )
  const repliesSheet = XLSX.utils.json_to_sheet(
    rows.filter((row) => row.parent_id),
  )
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, commentsSheet, XLSX_SHEET_COMMENTS)
  XLSX.utils.book_append_sheet(workbook, repliesSheet, XLSX_SHEET_REPLIES)

  const data = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })
  return new Uint8Array(data)
}
