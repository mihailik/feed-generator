type DatabaseSchema = {
  post: Post
  sub_state: SubState
}

type Post = {
  uri: string
  cid: string
  replyParent: string | null
  replyRoot: string | null
  indexedAt: string
}

type SubState = {
  service: string
  cursor: number
}
