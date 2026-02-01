# YouTube Comments Downloader

Web interface for downloading YouTube comments as CSV.

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

- `youtube.ts` - Core YouTube API client
- `index.ts` - HTTP server with routes
- `index.html` - Frontend (embedded CSS/JS)
- `python/` - Alternative Python CLI version

## YouTube API Notes

- Uses undocumented YouTube innertube API
- Pagination via continuation tokens (stack-based)
- Reply threads require separate continuation token fetching
- Initial continuation comes from `sortFilterSubMenuRenderer.subMenuItems`

## Bun Conventions

- Use `bun <file>` instead of `node`
- Use `bun test` instead of jest/vitest
- Bun.serve() for HTTP (not express)
- HTML imports work directly with Bun's bundler
