# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev           # Start with hot reload
bun run start         # Production start
bun test              # Run all tests
bun test youtube/     # Run tests in a directory
bun test parse.test   # Run a single test file
bun run test:coverage # Run tests with coverage
bun run typecheck     # TypeScript check
bun run lint          # ESLint check
bun run check         # Lint + typecheck + test in parallel (use before committing)
```

## Architecture

### Request Flow

1. `index.ts` routes `/api/comments` and `/api/comments/stream` to handlers
2. `server/handlers.ts` parses params via `server/params.ts` (Zod validation)
3. Handler calls `downloadComments()` from `youtube/download.ts`
4. Download orchestrates: fetch page → extract API key → paginate comments
5. Response formatted via `server/formats.ts` (CSV/JSON/XLSX/Markdown)

### YouTube Client (`youtube/`)

- `download.ts` - Main entry point, orchestrates the flow
- `fetch.ts` - HTTP calls using `neverthrow` Result types
- `parse.ts` - Extract comments from YouTube's mutation payloads
- `html.ts` - Parse initial page for API key, video title, initial continuation
- `types.ts` - Branded types (`VideoId`, `CommentId`) and interfaces

### Pagination Model

Comments use a stack-based continuation system:

- Initial continuation extracted from `sortFilterSubMenuRenderer.subMenuItems`
- Top-level comments: continuation tokens prepended to stack (process in order)
- Reply threads: continuation tokens appended to stack (depth-first)
- Each page returns mutations containing `commentEntityPayload` objects

### Error Handling

Uses `neverthrow` library throughout:

- `Result<T, E>` for sync operations
- `ResultAsync<T, E>` for async operations
- Chain with `.andThen()`, `.map()`, `.unwrapOr()`
- Abort signal checked via `abortIfNeeded()` between pagination requests

## Verification Workflow

**Before declaring a feature "done":**

1. Every implementation must end with adding/updating tests
2. Coverage target: 80-90% (`bun run test:coverage`)
3. Run `bun run check` (lint + typecheck + test); all must pass
4. Update README and CLAUDE.md if behavior changes
5. Remove dead code from the session
