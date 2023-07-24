// @ts-check

const algos = require('../algos');
const { AtUri } = require('@atproto/uri');

module.exports =
  /**
   * @param {import('../lexicon').Server} server
   * @param {AppContext} ctx
   */
  function (server, ctx) {
    server.app.bsky.feed.describeFeedGenerator(async () => {
      const feeds = Object.keys(algos).map((shortname) => ({
        uri: AtUri.make(
          ctx.cfg.publisherDid,
          'app.bsky.feed.generator',
          shortname,
        ).toString(),
      }))
      return {
        encoding: 'application/json',
        body: {
          did: ctx.cfg.serviceDid,
          feeds,
        },
      }
    })
  }
