// @ts-check

const { InvalidRequestError } = require('@atproto/xrpc-server');
const algos = require('../algos');
const { AtUri } = require('@atproto/uri');

module.exports =
  /**
   * @param {import('../lexicon').Server} server
   * @param {AppContext} ctx
   */
  function (server, ctx) {
    server.app.bsky.feed.getFeedSkeleton(async ({ params, req }) => {
      const feedUri = new AtUri(params.feed)
      const algo = algos[feedUri.rkey]
      if (
        feedUri.hostname !== ctx.cfg.publisherDid ||
        feedUri.collection !== 'app.bsky.feed.generator' ||
        !algo
      ) {
        throw new InvalidRequestError(
          'Unsupported algorithm',
          'UnsupportedAlgorithm',
        )
      }

      // import { validateAuth } from '../auth'
      /**
       * Example of how to check auth if giving user-specific results:
       *
       * const requesterDid = await validateAuth(
       *   req,
       *   ctx.cfg.serviceDid,
       *   ctx.didResolver,
       * )
       */

      const body = await algo(ctx, params)
      return {
        encoding: 'application/json',
        body: body,
      }
    })
  };
