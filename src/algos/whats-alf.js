// @ts-check

const { InvalidRequestError } = require('@atproto/xrpc-server');

// max 15 chars
const shortname = 'whats-alf'

/**
 * 
 * @param {Parameters<typeof import('../methods/feed-generation')>[1]} ctx
 * @param {import('../../lexicon-js/types/app/bsky/feed/getFeedSkeleton').QueryParams} params 
 * @returns 
 */
const handler = async (ctx, params) => {
  const cacheSlice = params.cursor ?
    ctx.cache.filter(item => !(item.stamp < String(params.cursor))) :
    ctx.cache;

  const feed = cacheSlice.map(({ stamp, reference }) => ({ post: reference }));

  return {
    cursor: cacheSlice.length > 0 ? cacheSlice[cacheSlice.length - 1].stamp : params.cursor,
    feed,
  };
}

module.exports = {
  shortname,
  handler
};
