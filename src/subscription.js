// @ts-check

/** @typedef {import('../lexicon-js/types/com/atproto/sync/subscribeRepos').OutputSchema} RepoEvent */

const { isCommit } = require('../lexicon-js/types/com/atproto/sync/subscribeRepos');
const { FirehoseSubscriptionBase, getOpsByType } = require('./util/subscription');

class FirehoseSubscription extends FirehoseSubscriptionBase {
  /**
   * @param {RepoEvent} evt
   */
  async handleEvent(evt) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    for (const post of ops.posts.creates) {
      console.log(post.record.text)
    }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        // only alf-related posts
        return create.record.text.toLowerCase().includes('alf')
      })
      .map((create) => {
        // map alf-related posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
        }
      })

    if (postsToDelete.length > 0) {
      console.log('postsToDelete+' + postsToDelete.length);
      // await this.db
      //   .deleteFrom('post')
      //   .where('uri', 'in', postsToDelete)
      //   .execute()
    }
    if (postsToCreate.length > 0) {
      console.log('postsToCreate+' + postsToCreate.length);
      // await this.db
      //   .insertInto('post')
      //   .values(postsToCreate)
      //   .onConflict((oc) => oc.doNothing())
      //   .execute()
    }
  }
}

module.exports = FirehoseSubscription;
