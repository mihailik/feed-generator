// @ts-check

/** @typedef {{
 * $type?: string;
 * seq?: number; // 176929363
 * prev?: CID;
 * repo?: string;
 * time?: string;
 * commit?: CID;
 * blobs?: any[];
 * rebase?: boolean;
 * tooBig?: boolean;
 * ops?: OpEntry[]; }} FirehoseRecord */

  /** @typedef {{
   *  toString(): string;
   *  code: number;
   *  version: number;
   *  bytes: Uint8Array;
   * }} CID */

  /** @typedef {{
   *  $type?: string;
   *  action?: string;
   *  cid?: CID;
   *  createdAt?: string;
   *  path?: string;
   *  text?: string;
   *  reply?: {
   *    cid: string;
   *    uri: string;
   *  };
   *  embed?: {
   *    $type: string; // app.bsky.embed.* - images, external, record, recordWithMedia
   *    images?: {
   *      image: BlobRef;
   *      alt: string;
   *    }[];
   *    media?: {
   *      $type: string;
   *      images: BlobRef[];
   *    };
   *    record: {
   *      cid: string;
   *      uri: string;
   *    };
   *    external?: {
   *      uri: string;
   *      thumb: BlobRef;
   *      title: string;
   *      description: string;
   *      facets: any[];
   *    };
   *  };
   * }} OpEntry */

  /** @typedef {{
   *  ref: CID;
   *  mimeType: string; // image/jpeg
   *  size: number;
   *  original: {
   *    $type: string; // blob
   *    ref: CID; // seems to be the same
   *    mimeType: string;
   *    size: number;
   *  }
   * }} BlobRef */

async function *getFirehose() {
  const { Subscription } = require('@atproto/xrpc-server');
  // const { Lexicons } = require('@atproto/lexicon');
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

    if (!blocks || !ops) {
      // yield evt;
      continue;
    }

    const car = await readCar(blocks);

    const mappedOps = ops.map(op => {
      if (!op.cid) return op;
      const recordBytes = car.blocks.get(op.cid);
      if (!recordBytes) return op;
      const record = cborToLexRecord(recordBytes);
      return { ...op, ...record };
    });
    

    yield /** @type {FirehoseRecord} */({ ...evt, blocks: undefined, ops: mappedOps });
  }
}

async function run() {
  let types = [];
  for await (const evt of getFirehose()) {
    if (!evt.ops) continue;
    for (const op of evt.ops) {
      if (op.text && op.embed?.$type && types.indexOf(op.embed.$type) < 0) {
        types.push(op.embed.$type);
        console.log(types.length, '   ', { text: op.text, ...op.embed });
      }
    }
    if (types.length >= 10) break;
  }
}

run();