import {
  ACCEPT_LANGUAGE,
  CLIENT_NAME,
  CLIENT_VERSION,
  COMMENT_SECTION_IDS,
  CONTINUATION_DELAY_MS,
  NEXT_PATH,
  USER_AGENT,
  WATCH_PATH,
} from './constants.ts'
import { abortIfNeeded } from './abort.ts'
import { parseCommentsFromMutations, searchDict } from './parse.ts'
import type {
  Comment,
  ContinuationAction,
  ContinuationEndpoint,
  ContinuationResponse,
} from './types.ts'

const REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': USER_AGENT,
} as const

const PAGE_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept-Language': ACCEPT_LANGUAGE,
} as const

async function fetchPage(baseUrl: string, videoId: string, signal?: AbortSignal): Promise<string> {
  const url = `${baseUrl}${WATCH_PATH}?v=${videoId}`
  const response = await fetch(url, {
    headers: PAGE_HEADERS,
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch video page: ${response.status}`)
  }

  return response.text()
}

async function fetchComments(
  baseUrl: string,
  apiKey: string,
  initialEndpoint: ContinuationEndpoint,
  minLikes: number,
  onProgress?: (count: number, filtered: number) => void,
  signal?: AbortSignal,
): Promise<Comment[]> {
  const comments: Comment[] = []
  const continuations: ContinuationEndpoint[] = [initialEndpoint]
  const progress = { processed: 0 }

  while (continuations.length > 0) {
    abortIfNeeded(signal)
    const continuation = continuations.pop()!
    const token = continuation.continuationCommand?.token
    if (!token) continue

    const response = await fetch(`${baseUrl}${NEXT_PATH}?key=${apiKey}`, {
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

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.status}`)
    }

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

    abortIfNeeded(signal)
    await new Promise((resolve) => setTimeout(resolve, CONTINUATION_DELAY_MS))
  }

  return comments
}

export { fetchPage, fetchComments }
