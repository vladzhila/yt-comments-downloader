# YouTube Comments Downloader

Download comments from YouTube videos and export them as CSV, JSON, XLSX, or Markdown.

## Features

- Downloads all comments and replies from any YouTube video
- Filter by minimum likes
- Exports to CSV, JSON, XLSX, or Markdown (sorted by popularity)
- Theme toggle (system, light, dark)
- Real-time progress via Server-Sent Events

## Setup

```bash
bun install
```

## Usage

```bash
bun run dev      # Development with hot reload
bun run start    # Production
```

Open http://localhost:3000

## API

Both endpoints accept the same query parameters:

| Param    | Description                        |
| -------- | ---------------------------------- |
| url      | YouTube video URL or ID (required) |
| minLikes | Minimum likes filter (default: 0)  |
| format   | csv, json, xlsx, md (default: csv) |

Query validation:

- `url` is required
- `minLikes` must be a non-negative integer
- invalid params return `400` with a JSON error message

The filename uses the video title when available and falls back to `yt_<videoId>`.

### GET /api/comments

Direct file download. Returns the file as an attachment.

### GET /api/comments/stream

Server-Sent Events stream with real-time progress updates.

`complete` event payload:

| Field    | Description                              |
| -------- | ---------------------------------------- |
| count    | Number of exported comments              |
| data     | File contents (plain text or base64)     |
| encoding | `utf-8` for text, `base64` for binary    |
| filename | Suggested filename for download          |
| mimeType | MIME type for the selected export format |

## Development

```bash
bun test              # Run tests
bun run test:coverage # Run tests with coverage report
bun run lint          # Run ESLint
bun run lint:fix      # Run ESLint with auto-fix
bun run typecheck     # TypeScript type checking
bun run format        # Format code with Prettier
bun run fix           # Format + lint fix (auto-fix all issues)
bun run check         # Lint + typecheck + test (read-only verification)
```

Pre-commit hooks automatically run lint-staged and checks.

## Project structure

- `index.ts`: server entrypoint and route wiring
- `server/`: request parsing, handlers, and response formatting
- `youtube.ts`: public exports for the YouTube client
- `youtube/`: fetch, parse, and format internals
- `index.html`: frontend UI (markup and styles)
- `main.js`: frontend JavaScript

## Formats

### CSV

| Column         | Description                     |
| -------------- | ------------------------------- |
| published_time | When the comment was posted     |
| author         | Username of commenter           |
| likes          | Number of likes                 |
| comment_id     | Unique comment identifier       |
| parent_id      | Parent comment ID (for replies) |
| comment        | Comment text                    |

### JSON

```json
{
  "comments": [
    { "cid": "...", "text": "...", "author": "...", "votes": 0, "time": "..." }
  ]
}
```

### XLSX

- `comments` sheet: top-level comments
- `replies` sheet: replies (parent_id = "reply")

### Markdown

- Markdown table with the same columns as CSV
