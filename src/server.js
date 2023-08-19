// @ts-check

const events = require('events');
const express = require('express');
const { DidResolver, MemoryCache } = require('@atproto/did-resolver');
const { createServer } = require('../lexicon-js');
const feedGeneration = require('./methods/feed-generation');
const describeGenerator = require('./methods/describe-generator');
// const { createDb, migrateToLatest } = require('./db');
const FirehoseSubscription = require('./subscription');
const wellKnown = require('./well-known');

class FeedGenerator {
     // * @param {Database} db
  // sqliteLocation: string

  /**
   * @param {express.Application} app
   * @param {FirehoseSubscription} firehose
   * @param {{
   * port: number
   * listenhost: string
   * hostname: string
   * subscriptionEndpoint: string
   * serviceDid: string
   * publisherDid: string
   * subscriptionReconnectDelay: number
   * }} cfg
   */
  constructor(app, /*db, */ firehose, cfg) {
    this.app = app
    // this.db = db
    this.firehose = firehose
    this.cfg = cfg
  }

  /** @param {ConstructorParameters<typeof FeedGenerator>[2]} cfg */
  static create(cfg) {
    const app = express()
    // const db = createDb(cfg.sqliteLocation)
    const firehose = new FirehoseSubscription(/*db,*/ cfg.subscriptionEndpoint)

    const didCache = new MemoryCache()
    const didResolver = new DidResolver(
      { plcUrl: 'https://plc.directory' },
      didCache,
    )

    const server = createServer({
      validateResponse: true,
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: 5 * 1024 * 1024, // 5mb
      },
    })

    const ctx = {
      // db,
      didResolver,
      cfg,
    }
    feedGeneration(server, ctx)
    describeGenerator(server, ctx)
    app.use(server.xrpc.router)
    app.use(wellKnown(ctx))

    return new FeedGenerator(app, /*db,*/ firehose, cfg)
  }

  async start() {
    // await migrateToLatest(this.db)
    this.firehose.run(this.cfg.subscriptionReconnectDelay)
    this.server = this.app.listen(this.cfg.port, this.cfg.listenhost)
    await events.once(this.server, 'listening')
    return this.server
  }
}

module.exports = FeedGenerator
