# YouTube Comments Downloader

Download comments from YouTube videos and export them as CSV.

## Features

- Downloads all comments and replies from any YouTube video
- Filter by minimum likes
- Exports to CSV (sorted by popularity)
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

| Param | Description |
|-------|-------------|
| url | YouTube video URL or ID |
| minLikes | Minimum likes filter (default: 3) |

## Testing

```bash
bun test
```

## CSV Format

| Column | Description |
|--------|-------------|
| published_time | When the comment was posted |
| author | Username of commenter |
| likes | Number of likes |
| comment_id | Unique comment identifier |
| parent_id | Parent comment ID (for replies) |
| comment | Comment text |

## Python CLI

A Python CLI version is available in [python/](python/). See [python/README.md](python/README.md).
