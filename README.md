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

### GET /api/comments/stream

Server-Sent Events stream for downloading comments.

| Param    | Description                        |
| -------- | ---------------------------------- |
| url      | YouTube video URL or ID            |
| minLikes | Minimum likes filter (default: 0)  |
| format   | csv, json, xlsx, md (default: csv) |

Query validation:

- `url` is required
- `minLikes` must be a non-negative integer
- invalid params return `400` with a JSON error message

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
bun run format        # Format code with Prettier
bun run check         # Run lint + test in parallel
bun run typecheck     # TypeScript type checking
```

Pre-commit hooks automatically run lint-staged and checks.

## Project structure

- `index.ts`: server entrypoint and route wiring
- `server/`: request parsing, handlers, and response formatting
- `youtube.ts`: public exports for the YouTube client
- `youtube/`: fetch, parse, and format internals
- `index.html`: frontend UI

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
{ "comments": [{ "cid": "...", "text": "...", "author": "...", "votes": 0, "time": "..." }] }
```

### XLSX

- `comments` sheet: top-level comments
- `replies` sheet: replies (parent_id = "reply")

### Markdown

- Markdown table with the same columns as CSV

## Python CLI

A Python CLI version is available in [python/](python/). See [python/README.md](python/README.md).
