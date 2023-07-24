// @ts-check

const { InvalidRequestError } = require('@atproto/xrpc-server');

// max 15 chars
const shortname = 'whats-alf'

/**
 * 
 * @param {AppContext} ctx
 * @param {import('../../lexicon-js/types/app/bsky/feed/getFeedSkeleton')} params 
 * @returns 
 */
const handler = async (ctx, params) => {
  let builder = ctx.db
    .selectFrom('post')
    .selectAll()
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(params.limit)

  if (params.cursor) {
    const [indexedAt, cid] = params.cursor.split('::')
    if (!indexedAt || !cid) {
      throw new InvalidRequestError('malformed cursor')
    }
    const timeStr = new Date(parseInt(indexedAt, 10)).toISOString()
    builder = builder
      .where('post.indexedAt', '<', timeStr)
      .orWhere((qb) => qb.where('post.indexedAt', '=', timeStr))
      .where('post.cid', '<', cid)
  }
  const res = await builder.execute()

  const feed = res.map((row) => ({
    post: row.uri,
  }))

  /** @type {string | undefined} */
  let cursor
  const last = res.at(-1)
  if (last) {
    cursor = `${new Date(last.indexedAt).getTime()}::${last.cid}`
  }

  return {
    cursor,
    feed,
  }
}

module.exports = {
  shortname,
  handler
};
