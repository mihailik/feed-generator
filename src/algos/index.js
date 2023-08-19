const whatsAlf = require('./whats-alf');

const algos = {
  [whatsAlf.shortname]: whatsAlf.handler,
}

module.exports = algos;
