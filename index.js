// @ts-check

async function *getFirehose() {
  const { Subscription } = require('@atproto/xrpc-server');
  const { Lexicons } = require('@atproto/lexicon');
  const { cborToLexRecord, readCar } = require('@atproto/repo');

  const ids = {
    ComAtprotoSyncSubscribeRepos: 'com.atproto.sync.subscribeRepos'
  };
  const service = 'wss://bsky.social';


  /** @type {Subscription<any>} */
  const sub = new Subscription({
    service: service,
    method: ids.ComAtprotoSyncSubscribeRepos,
    // getParams: () => /** @type {*} */(this.getCursor()),
    validate: /** @type {*} */(value) => {
      // lexicons.assertValidXrpcMessage(ids.ComAtprotoSyncSubscribeRepos, value)
      if (value?.$type === ids.ComAtprotoSyncSubscribeRepos) return value;
      return value;
    },
  });

  for await (const evt of sub) {
    if (!evt) continue;

    const { blocks, ops } = evt;

    if (!blocks || !ops) yield evt;

    const car = await readCar(blocks);

    const enriched = { ...evt, car };

    const mappedOps = ops.map(op => {
      if (!op.cid) return op;
      const recordBytes = car.blocks.get(op.cid);
      if (!recordBytes) return op;
      const record = cborToLexRecord(recordBytes);
      return { ...op, ...record };
    });
    

    yield { ...evt, blocks: undefined, ops: mappedOps };
  }
}

async function run() {
  let number = 0;
  for await (const evt of getFirehose()) {
    if (!evt.ops) continue;
    for (const op of evt.ops) {
      if (op.text) {
        console.log(number, '   ', { ...evt, ops: undefined, ...op });
        number++;
        if (number >= 10) break;
      }
    }
  }
}

run();