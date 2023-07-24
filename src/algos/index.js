const whatsAlf = require('./whats-alf');

/** @type {Record<string, AlgoHandler>} */
const algos = {
  [whatsAlf.shortname]: whatsAlf.handler,
}

module.exports = algos;
