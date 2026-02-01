interface Comment {
  cid: string
  text: string
  author: string
  votes: number
  time: string
  parent?: string
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
