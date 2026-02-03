type Brand<T, B extends string> = T & { readonly __brand: B }

export type VideoId = Brand<string, 'VideoId'>
export type CommentId = Brand<string, 'CommentId'>
export type ReplyMarker = 'reply'

export interface Comment {
  cid: CommentId
  text: string
  author: string
  votes: number
  time: string
  parent?: ReplyMarker
}

export interface CommentResult {
  comments: Comment[]
  videoTitle?: string
  error?: string
}

export interface CommentEntityPayload {
  key: string
  properties?: {
    commentId?: string
    content?: { content?: string }
    publishedTime?: string
    replyLevel?: number
  }
  author?: {
    displayName?: string
  }
  toolbar?: {
    likeCountNotliked?: string
  }
}

export interface Mutation {
  payload?: {
    commentEntityPayload?: CommentEntityPayload
  }
  entityKey?: string
}

export interface ContinuationEndpoint {
  continuationCommand?: {
    token?: string
  }
  commandMetadata?: {
    webCommandMetadata?: {
      apiUrl?: string
    }
  }
}

export interface ContinuationAction {
  targetId?: string
  continuationItems?: unknown[]
}

export interface ButtonRenderer {
  command?: ContinuationEndpoint
}

export interface OembedResponse {
  title?: string
}

export interface FetchCommentsOptions {
  baseUrl: string
  apiKey: string
  initialEndpoint: ContinuationEndpoint
  minLikes: number
  onProgress?: (count: number, filtered: number) => void
  signal?: AbortSignal
}

export interface ContinuationResponse {
  onResponseReceivedEndpoints?: Array<{
    reloadContinuationItemsCommand?: ContinuationAction
    appendContinuationItemsAction?: ContinuationAction
  }>
  frameworkUpdates?: {
    entityBatchUpdate?: {
      mutations?: Mutation[]
    }
  }
}

export interface SortMenuItem {
  serviceEndpoint?: ContinuationEndpoint
}

export interface SortFilterSubMenuRenderer {
  subMenuItems?: SortMenuItem[]
}
