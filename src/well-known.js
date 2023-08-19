// @ts-check

const express = require('express');

/**
 * @param {{
 *  cfg: {
 *   serviceDid: string
 *   hostname: string
 *  }
 * }} ctx
 */
const makeRouter = (ctx) => {
  const router = express.Router()

  router.get('/.well-known/did.json', (_req, res) => {
    if (!ctx.cfg.serviceDid.endsWith(ctx.cfg.hostname)) {
      return res.sendStatus(404)
    }
    res.json({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: ctx.cfg.serviceDid,
      service: [
        {
          id: '#bsky_fg',
          type: 'BskyFeedGenerator',
          serviceEndpoint: `https://${ctx.cfg.hostname}`,
        },
      ],
    })
  })

  return router
}
module.exports = makeRouter
