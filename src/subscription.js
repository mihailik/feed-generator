// @ts-check

/** @typedef {import('../lexicon-js/types/com/atproto/sync/subscribeRepos').OutputSchema} RepoEvent */

const { isCommit } = require('../lexicon-js/types/com/atproto/sync/subscribeRepos');
const { FirehoseSubscriptionBase, getOpsByType } = require('./util/subscription');

class FirehoseSubscription extends FirehoseSubscriptionBase {

  /** @type {{ stamp: string, reference: string }[]} */
  cache = [];

  /**
   * @param {RepoEvent} evt
   */
  async handleEvent(evt) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    if (ops.posts.creates.length + ops.posts.deletes.length > 0) {
      for (const cr of ops.posts.creates) {
        this.cache.push({ stamp: 't' + Date.now(), reference: cr.uri });
      }
      while (this.cache.length > 20) {
        this.cache.shift();
      }

      // console.log(
      //   (ops.posts.creates.length ? 'creates[' + ops.posts.creates.length + '] ' : '') +
      //   (ops.posts.deletes.length ? 'deletes[' + ops.posts.deletes.length + '] ' : '') + 
      //   ':'
      // );
      for (const post of ops.posts.creates) {
        let shorte = (post.record.text || '').replace(/\s+/g, ' ').trim();
        if (shorte.length > 50) shorte = shorte.slice(0, 48).trim() + '...';
        console.log(
          '   [' + post.author + '] ',
          shorte,
          post.record.embed ? ' [' + (post.record.embed['$type'] || '').replace(/^app\.bsky\.embed/, '') + ']' : '');
      }
      for (const post of ops.posts.deletes) {
        console.log('   [del] ', post.uri/*.text*/);
      }
    }
  }
}

module.exports = FirehoseSubscription;
