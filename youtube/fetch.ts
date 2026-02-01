import {
  ACCEPT_LANGUAGE,
  CLIENT_NAME,
  CLIENT_VERSION,
  COMMENT_SECTION_IDS,
  CONTINUATION_DELAY_MS,
  NEXT_PATH,
  CANCELLED_ERROR_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
  USER_AGENT,
  WATCH_PATH,
} from './constants.ts'
import { abortIfNeeded } from './abort.ts'
import { parseCommentsFromMutations, searchDict } from './parse.ts'
import { err, ok } from './result.ts'
import type {
  Comment,
  ContinuationAction,
  ContinuationEndpoint,
  ContinuationResponse,
  VideoId,
} from './types.ts'
import type { Result } from './result.ts'

const REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': USER_AGENT,
} as const

const PAGE_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept-Language': ACCEPT_LANGUAGE,
} as const

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return UNKNOWN_ERROR_MESSAGE
}

async function safeFetch(url: string, init: RequestInit): Promise<Result<Response>> {
  return fetch(url, init)
    .then((response) => ok(response))
    .catch((error) => {
      if (init.signal?.aborted) return err(CANCELLED_ERROR_MESSAGE)
      return err(getErrorMessage(error))
    })
}

async function fetchPage(
  baseUrl: string,
  videoId: VideoId,
  signal?: AbortSignal,
): Promise<Result<string>> {
  const url = `${baseUrl}${WATCH_PATH}?v=${videoId}`
  const responseResult = await safeFetch(url, {
    headers: PAGE_HEADERS,
    signal,
  })

  if (!responseResult.ok) return responseResult

  const response = responseResult.value
  if (!response.ok) return err(`Failed to fetch video page: ${response.status}`)

  return ok(await response.text())
}

async function fetchComments(
  baseUrl: string,
  apiKey: string,
  initialEndpoint: ContinuationEndpoint,
  minLikes: number,
  onProgress?: (count: number, filtered: number) => void,
  signal?: AbortSignal,
): Promise<Result<Comment[]>> {
  const comments: Comment[] = []
  const continuations: ContinuationEndpoint[] = [initialEndpoint]
  const progress = { processed: 0 }

  while (continuations.length > 0) {
    const abortResult = abortIfNeeded(signal)
    if (!abortResult.ok) return abortResult

    const continuation = continuations.pop()
    if (!continuation) continue
    const token = continuation.continuationCommand?.token
    if (!token) continue

    const responseResult = await safeFetch(`${baseUrl}${NEXT_PATH}?key=${apiKey}`, {
      method: 'POST',
      headers: REQUEST_HEADERS,
      body: JSON.stringify({
        context: {
          client: {
            clientName: CLIENT_NAME,
            clientVersion: CLIENT_VERSION,
          },
        },
        continuation: token,
      }),
      signal,
    })

    if (!responseResult.ok) return responseResult

    const response = responseResult.value
    if (!response.ok) return err(`Failed to fetch comments: ${response.status}`)

    const data = (await response.json()) as ContinuationResponse
    const mutations = data.frameworkUpdates?.entityBatchUpdate?.mutations ?? []
    const batchComments = parseCommentsFromMutations(mutations, minLikes)
    comments.push(...batchComments)
    progress.processed += mutations.length

    if (onProgress && mutations.length > 0 && !signal?.aborted) {
      onProgress(progress.processed, comments.length)
    }

    const reloadActions = [...searchDict(data, 'reloadContinuationItemsCommand')]
    const appendActions = [...searchDict(data, 'appendContinuationItemsAction')]
    const allActions = [...reloadActions, ...appendActions] as ContinuationAction[]

    for (const action of allActions) {
      const targetId = action.targetId ?? ''
      const items = action.continuationItems ?? []

      for (const item of items) {
        if (!item || typeof item !== 'object') continue

        const endpoints = [...searchDict(item, 'continuationEndpoint')] as ContinuationEndpoint[]

        if (COMMENT_SECTION_IDS.includes(targetId)) {
          continuations.unshift(...endpoints)
          continue
        }

        if (targetId.startsWith('comment-replies-item')) {
          if ('continuationItemRenderer' in item) {
            const buttonRenderers = [...searchDict(item, 'buttonRenderer')] as Array<{
              command?: ContinuationEndpoint
            }>
            for (const btn of buttonRenderers) {
              if (btn.command?.continuationCommand?.token) {
                continuations.push(btn.command)
              }
            }
          } else {
            continuations.unshift(...endpoints)
          }
        }
      }
    }

    const abortAfter = abortIfNeeded(signal)
    if (!abortAfter.ok) return abortAfter
    await new Promise((resolve) => setTimeout(resolve, CONTINUATION_DELAY_MS))
  }

  return ok(comments)
}

export { fetchPage, fetchComments }
