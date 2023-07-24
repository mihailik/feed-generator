// @ts-check

const { Subscription } = require('@atproto/xrpc-server')
const { cborToLexRecord, readCar } = require('@atproto/repo')
const { BlobRef } = require('@atproto/lexicon')
const { ids, lexicons } = require('../../lexicon-js/lexicons')

/** @typedef {import('../../lexicon-js/types/app/bsky/feed/post').Record} PostRecord */
/** @typedef {import('../../lexicon-js/types/app/bsky/feed/repost').Record} RepostRecord */
/** @typedef {import('../../lexicon-js/types/app/bsky/feed/like').Record} LikeRecord */
/** @typedef {import('../../lexicon-js/types/app/bsky/graph/follow').Record} FollowRecord */
/** @typedef {import('../../lexicon-js/types/com/atproto/sync/subscribeRepos').Commit} Commit */
/** @typedef {import('../../lexicon-js/types/com/atproto/sync/subscribeRepos').OutputSchema} RepoEvent */

const { isCommit } = require('../../lexicon-js/types/com/atproto/sync/subscribeRepos');

class FirehoseSubscriptionBase {

  /**
   * @param {Database} db
   * @param {string} service
   */
  constructor(db, service) {
    this.db = db;
    this.service = service;
    this.sub = new Subscription({
      service: service,
      method: ids.ComAtprotoSyncSubscribeRepos,
      getParams: () => this.getCursor(),
      validate: (value) => {
        try {
          return lexicons.assertValidXrpcMessage(
            ids.ComAtprotoSyncSubscribeRepos,
            value,
          )
        } catch (err) {
          console.error('repo subscription skipped invalid message', err)
        }
      },
    })
  }

  /**
   * @abstract
   * @param {RepoEvent} evt
   */
  handleEvent(evt) { throw new Error('Not implemented.'); }

  /**
   * @param {number} subscriptionReconnectDelay
   */
  async run(subscriptionReconnectDelay) {
    try {
      for await (const evt of this.sub) {
        try {
          await this.handleEvent(evt)
        } catch (err) {
          console.error('repo subscription could not handle message', err)
        }
        // update stored cursor every 20 events or so
        if (isCommit(evt) && evt.seq % 20 === 0) {
          await this.updateCursor(evt.seq)
        }
      }
    } catch (err) {
      console.error('repo subscription errored', err)
      setTimeout(() => this.run(subscriptionReconnectDelay), subscriptionReconnectDelay)
    }
  }

  /**
   * @param {number} cursor
   */
  async updateCursor(cursor) {
    await this.db
      .updateTable('sub_state')
      .set({ cursor })
      .where('service', '=', this.service)
      .execute()
  }

  async getCursor() {
    const res = await this.db
      .selectFrom('sub_state')
      .selectAll()
      .where('service', '=', this.service)
      .executeTakeFirst()
    return res ? { cursor: res.cursor } : {}
  }
}

/**
 * @param {Commit} evt
 */
const getOpsByType = async (evt) => {
  const car = await readCar(evt.blocks)
  /** @type {OperationsByType} */
  const opsByType = {
    posts: { creates: [], deletes: [] },
    reposts: { creates: [], deletes: [] },
    likes: { creates: [], deletes: [] },
    follows: { creates: [], deletes: [] },
  }

  for (const op of evt.ops) {
    const uri = `at://${evt.repo}/${op.path}`
    const [collection] = op.path.split('/')

    if (op.action === 'update') continue // updates not supported yet

    if (op.action === 'create') {
      if (!op.cid) continue
      const recordBytes = car.blocks.get(op.cid)
      if (!recordBytes) continue
      const record = cborToLexRecord(recordBytes)
      const create = { uri, cid: op.cid.toString(), author: evt.repo }
      if (collection === ids.AppBskyFeedPost && isPost(record)) {
        opsByType.posts.creates.push({ record, ...create })
      } else if (collection === ids.AppBskyFeedRepost && isRepost(record)) {
        opsByType.reposts.creates.push({ record, ...create })
      } else if (collection === ids.AppBskyFeedLike && isLike(record)) {
        opsByType.likes.creates.push({ record, ...create })
      } else if (collection === ids.AppBskyGraphFollow && isFollow(record)) {
        opsByType.follows.creates.push({ record, ...create })
      }
    }

    if (op.action === 'delete') {
      if (collection === ids.AppBskyFeedPost) {
        opsByType.posts.deletes.push({ uri })
      } else if (collection === ids.AppBskyFeedRepost) {
        opsByType.reposts.deletes.push({ uri })
      } else if (collection === ids.AppBskyFeedLike) {
        opsByType.likes.deletes.push({ uri })
      } else if (collection === ids.AppBskyGraphFollow) {
        opsByType.follows.deletes.push({ uri })
      }
    }
  }

  return opsByType
}

/** @type {(obj: unknown) => obj is PostRecord} */
const isPost = (obj) => {
  return isType(obj, ids.AppBskyFeedPost)
}

/** @type {(obj: unknown): obj is RepostRecord} */
const isRepost = (obj) => {
  return isType(obj, ids.AppBskyFeedRepost)
}

/** @type {(obj: unknown): obj is LikeRecord} */
const isLike = (obj) => {
  return isType(obj, ids.AppBskyFeedLike)
}

/** @type {(obj: unknown): obj is FollowRecord} */
const isFollow = (obj) => {
  return isType(obj, ids.AppBskyGraphFollow)
}

const isType = (obj, nsid) => {
  try {
    lexicons.assertValidRecord(nsid, fixBlobRefs(obj))
    return true
  } catch (err) {
    return false
  }
}

// @TODO right now record validation fails on BlobRefs
// simply because multiple packages have their own copy
// of the BlobRef class, causing instanceof checks to fail.
// This is a temporary solution.
const fixBlobRefs = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(fixBlobRefs)
  }
  if (obj && typeof obj === 'object') {
    if (obj.constructor.name === 'BlobRef') {
      const blob = /** @type {BlobRef} */(obj)
      return new BlobRef(blob.ref, blob.mimeType, blob.size, blob.original)
    }
    return Object.entries(obj).reduce((acc, [key, val]) => {
      return Object.assign(acc, { [key]: fixBlobRefs(val) })
    }, {})
  }
  return obj
}

module.exports = {
  FirehoseSubscriptionBase,
  getOpsByType,
  isPost,
  isRepost,
  isLike,
  isFollow
}
