# YouTube Comments Downloader

Web interface for downloading YouTube comments as CSV, JSON, XLSX, or Markdown.

## Stack

- Runtime: Bun
- Server: Bun.serve() with HTML imports
- Frontend: Vanilla HTML/CSS/JS (no frameworks)

## Commands

```bash
bun run dev           # Start with hot reload
bun run start         # Production start
bun test              # Run tests
bun run test:coverage # Run tests with coverage
bun run typecheck     # TypeScript check
bun run lint          # ESLint check
bun run format        # Prettier format
bun run check         # Lint + test in parallel
```

## Key Files

- `index.ts` - HTTP server entrypoint and routing
- `server/` - Server helpers (params, handlers, format builders)
- `youtube.ts` - Public YouTube client exports
- `youtube/` - YouTube client internals (fetch, parsing, formatting)
- `index.html` - Frontend (embedded CSS/JS)

## YouTube API Notes

- Uses undocumented YouTube innertube API
- Pagination via continuation tokens (stack-based)
- Reply threads require separate continuation token fetching
- Initial continuation comes from `sortFilterSubMenuRenderer.subMenuItems`
- Error handling uses `neverthrow` (`Result`, `ResultAsync`, `andThen` chains)

## Bun Conventions

- Use `bun <file>` instead of `node`
- Use `bun test` instead of jest/vitest
- Bun.serve() for HTTP (not express)
- HTML imports work directly with Bun's bundler

## Verification Workflow

**Before declaring a feature "done":**

1. CRITICAL: every implementation must end with adding/updating tests
2. CRITICAL: Coverage target: 80-90%. Prioritize test quality over chasing 100% (`bun run test:coverage`)
3. CRITICAL: runs lint, typecheck, and test concurrently (`bun run check`); all must pass
4. CRITICAL: all documents (e.g. readme, claude md files) must be updated and actualized
5. ALWAYS REMOVE DEAD CODE. ALWAYS remove any code that proved unnecessary or didn’t work during the session
