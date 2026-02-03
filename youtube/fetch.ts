import { ok, err, ResultAsync, errAsync, type Result } from 'neverthrow'
import {
  ACCEPT_LANGUAGE,
  CLIENT_NAME,
  CLIENT_VERSION,
  COMMENT_SECTION_ID_SET,
  CONTINUATION_DELAY_MS,
  NEXT_PATH,
  OEMBED_PATH,
  OEMBED_URL_PARAM,
  OEMBED_FORMAT_PARAM,
  OEMBED_FORMAT,
  CANCELLED_ERROR_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
  USER_AGENT,
  WATCH_PATH,
} from './constants.ts'
import { abortIfNeeded } from './abort.ts'
import { isContinuationEndpoint, isRecord } from './guards.ts'
import { parseCommentsFromMutations, searchDict } from './parse.ts'
import type {
  ButtonRenderer,
  Comment,
  ContinuationAction,
  ContinuationEndpoint,
  FetchCommentsOptions,
  Mutation,
  OembedResponse,
  VideoId,
} from './types.ts'

const REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': USER_AGENT,
} as const satisfies RequestInit['headers']

const PAGE_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept-Language': ACCEPT_LANGUAGE,
} as const satisfies RequestInit['headers']

const REPLY_ITEM_PREFIX = 'comment-replies-item'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return UNKNOWN_ERROR_MESSAGE
}

function safeFetch(
  url: string,
  init: RequestInit,
): ResultAsync<Response, string> {
  return ResultAsync.fromPromise(fetch(url, init), (e) =>
    init.signal?.aborted ? CANCELLED_ERROR_MESSAGE : getErrorMessage(e),
  )
}

export function fetchPage(
  baseUrl: string,
  videoId: VideoId,
  signal?: AbortSignal,
): ResultAsync<string, string> {
  const url = `${baseUrl}${WATCH_PATH}?v=${videoId}`
  return safeFetch(url, {
    headers: PAGE_HEADERS,
    signal,
  }).andThen((response) =>
    response.ok
      ? ResultAsync.fromPromise(
          response.text(),
          () => 'Failed to read response',
        )
      : errAsync(`Failed to fetch video page: ${response.status}`),
  )
}

function buildOembedUrl(baseUrl: string, videoId: VideoId): string {
  const watchUrl = `${baseUrl}${WATCH_PATH}?v=${videoId}`
  return `${baseUrl}${OEMBED_PATH}?${OEMBED_URL_PARAM}=${encodeURIComponent(watchUrl)}&${OEMBED_FORMAT_PARAM}=${OEMBED_FORMAT}`
}

function isOembedResponse(data: unknown): data is OembedResponse {
  return isRecord(data)
}

function extractTitle(data: unknown): string | null {
  if (!isOembedResponse(data)) {
    return null
  }
  return typeof data.title === 'string' ? data.title : null
}

export async function fetchOembedTitle(
  baseUrl: string,
  videoId: VideoId,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = buildOembedUrl(baseUrl, videoId)
  const result = await safeFetch(url, {
    headers: PAGE_HEADERS,
    signal,
  })
    .andThen((r) => (r.ok ? ok(r) : err(null)))
    .andThen((r) => ResultAsync.fromPromise(r.json(), () => null))
    .map(extractTitle)

  return result.unwrapOr(null)
}

function buildRequestBody(token: string): string {
  return JSON.stringify({
    context: {
      client: {
        clientName: CLIENT_NAME,
        clientVersion: CLIENT_VERSION,
      },
    },
    continuation: token,
  })
}

function isMutation(value: unknown): value is Mutation {
  return isRecord(value)
}

function extractMutations(value: unknown): Mutation[] {
  if (!isRecord(value)) {
    return []
  }
  const frameworkUpdates = value.frameworkUpdates
  if (!isRecord(frameworkUpdates)) {
    return []
  }
  const entityBatchUpdate = frameworkUpdates.entityBatchUpdate
  if (!isRecord(entityBatchUpdate)) {
    return []
  }
  const mutations = entityBatchUpdate.mutations
  if (!Array.isArray(mutations)) {
    return []
  }
  return mutations.filter(isMutation)
}

function isButtonRenderer(value: unknown): value is ButtonRenderer {
  return isRecord(value) && Object.hasOwn(value, 'command')
}

function hasContinuationToken(
  endpoint: ContinuationEndpoint,
): endpoint is ContinuationEndpoint & {
  continuationCommand: { token: string }
} {
  return typeof endpoint.continuationCommand?.token === 'string'
}

function hasValidToken(
  btn: ButtonRenderer,
): btn is ButtonRenderer & { command: ContinuationEndpoint } {
  if (!btn.command) {
    return false
  }
  return hasContinuationToken(btn.command)
}

function extractReplyButtonEndpoints(
  item: Record<string, unknown>,
): ContinuationEndpoint[] {
  return [...searchDict(item, 'buttonRenderer')]
    .filter(isButtonRenderer)
    .filter(hasValidToken)
    .map((btn) => btn.command)
}

function processContinuationItem(
  item: unknown,
  targetId: string,
  continuations: ContinuationEndpoint[],
): void {
  if (!isRecord(item)) {
    return
  }

  const endpoints = [...searchDict(item, 'continuationEndpoint')].filter(
    isContinuationEndpoint,
  )

  if (COMMENT_SECTION_ID_SET.has(targetId)) {
    continuations.unshift(...endpoints)
    return
  }

  if (!targetId.startsWith(REPLY_ITEM_PREFIX)) {
    return
  }

  if (Object.hasOwn(item, 'continuationItemRenderer')) {
    continuations.push(...extractReplyButtonEndpoints(item))
    return
  }
  continuations.unshift(...endpoints)
}

function isContinuationAction(value: unknown): value is ContinuationAction {
  return isRecord(value)
}

function processActions(
  actions: readonly unknown[],
  continuations: ContinuationEndpoint[],
): void {
  for (const action of actions) {
    if (!isContinuationAction(action)) {
      continue
    }
    const targetId = action.targetId ?? ''
    const items = action.continuationItems ?? []
    for (const item of items) {
      processContinuationItem(item, targetId, continuations)
    }
  }
}

export async function fetchComments(
  options: FetchCommentsOptions,
): Promise<Result<Comment[], string>> {
  const { baseUrl, apiKey, initialEndpoint, minLikes, onProgress, signal } =
    options
  const comments: Comment[] = []
  const continuations: ContinuationEndpoint[] = [initialEndpoint]
  const progress = { processed: 0 }

  while (continuations.length > 0) {
    const abortResult = abortIfNeeded(signal)
    if (abortResult.isErr()) {
      return err(abortResult.error)
    }

    const continuation = continuations.pop()
    const token = continuation?.continuationCommand?.token
    if (!token) {
      continue
    }

    const url = `${baseUrl}${NEXT_PATH}?key=${apiKey}`
    const responseResult = await safeFetch(url, {
      method: 'POST',
      headers: REQUEST_HEADERS,
      body: buildRequestBody(token),
      signal,
    })

    if (responseResult.isErr()) {
      return err(responseResult.error)
    }
    const response = responseResult.value
    if (!response.ok) {
      return err(`Failed to fetch comments: ${response.status}`)
    }

    const data = await response.json()
    const mutations = extractMutations(data)
    const batchComments = parseCommentsFromMutations(mutations, minLikes)
    comments.push(...batchComments)
    progress.processed += mutations.length

    if (onProgress && mutations.length > 0 && !signal?.aborted) {
      onProgress(progress.processed, comments.length)
    }

    const reloadActions = [
      ...searchDict(data, 'reloadContinuationItemsCommand'),
    ]
    const appendActions = [...searchDict(data, 'appendContinuationItemsAction')]
    processActions([...reloadActions, ...appendActions], continuations)

    const abortAfter = abortIfNeeded(signal)
    if (abortAfter.isErr()) {
      return err(abortAfter.error)
    }
    await new Promise((resolve) => setTimeout(resolve, CONTINUATION_DELAY_MS))
  }

  return ok(comments)
}
