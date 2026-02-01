type Brand<T, B extends string> = T & { readonly __brand: B }

type VideoId = Brand<string, 'VideoId'>
type CommentId = Brand<string, 'CommentId'>
type ReplyMarker = 'reply'

interface Comment {
  cid: CommentId
  text: string
  author: string
  votes: number
  time: string
  parent?: ReplyMarker
}

interface CommentResult {
  comments: Comment[]
  videoTitle?: string
  error?: string
}

interface CommentEntityPayload {
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

interface Mutation {
  payload?: {
    commentEntityPayload?: CommentEntityPayload
  }
  entityKey?: string
}

interface ContinuationEndpoint {
  continuationCommand?: {
    token?: string
  }
  commandMetadata?: {
    webCommandMetadata?: {
      apiUrl?: string
    }
  }
}

interface ContinuationAction {
  targetId?: string
  continuationItems?: unknown[]
}

interface ContinuationResponse {
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

interface SortMenuItem {
  serviceEndpoint?: ContinuationEndpoint
}

interface SortFilterSubMenuRenderer {
  subMenuItems?: SortMenuItem[]
}

export type {
  VideoId,
  CommentId,
  ReplyMarker,
  Comment,
  CommentResult,
  CommentEntityPayload,
  Mutation,
  ContinuationEndpoint,
  ContinuationAction,
  ContinuationResponse,
  SortMenuItem,
  SortFilterSubMenuRenderer,
}
