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
   *    root: { cid: string; uri: string };
   *    parent: { cid: string; uri: string };
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

async function* serveRequests(options) {
  const http = require('http');
  const URL = require('url');

  /** @type {{ req: import('http').IncomingMessage & { parsedUrl?: import('url').UrlWithParsedQuery, body?: any }, res: import('http').ServerResponse }[]} */
  const requests = [];
  let waitingPromiseResolve;
  const server = http.createServer(async function (req, res) {
    const parsedUrl = URL.parse('http://' + req.headers.host + req.url, true);
    /** @type {*} */(req).parsedUrl = parsedUrl;
    if (req.method === 'POST') {
      let body = await new Promise(resolve => {
        const bufs = [];
        req.on('data', (chunk) => {
          bufs.push(chunk);
        });
        req.on('end', () => {
          const whole = Buffer.concat(bufs);
          resolve(whole);
        });
      });

      if (body.length) {
        let anyWeirdCharacters = false;
        for (let i = 0; i < body.length; i++) {
          if (body[i] < 32 || body[i] === 0xFF) {
            anyWeirdCharacters = true;
            break;
          }
        }

        if (!anyWeirdCharacters) {
          try {
            const str = body.toString('utf8');

            try {
              const json = JSON.parse(str);
              body = json;
            } catch (nonJsonError) {
              body = str;
              // log?
            }
          } catch (nonUtf8Error) {
            // log?
          }
        }

        /** @type {*} */(req).body = body;
      }
    }

    requests.push({ req, res });

    if (waitingPromiseResolve) waitingPromiseResolve();
  });

  server.listen(options || { port: 3000, host: '0.0.0.0' });

  try {

    while (true) {
      const next = requests.shift();
      if (next) {
        yield next;
        continue;
      }

      await new Promise(resolve => {
        waitingPromiseResolve = resolve;
      });
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function runServer(list) {
  console.log('runServer...');
  for await (const { req, res } of serveRequests()) {
    console.log(req.method + ' ', req.parsedUrl, req.body, list);
    res.end('[\n' + list.map(({ evt, op }) => JSON.stringify({ post: `at://${evt.repo}/${op.path}` })).join(',\n') + '\n]');
  }
}

async function runFirehose(list) {
  for await (const evt of getFirehose()) {
    if (!evt.ops) continue;
    for (const op of evt.ops) {
      if (op.text) {
        list.push({ evt, op });
      }
    }

    while (list.length > 20) list.shift();
  }
}

function run() {
  const list = [];
  runFirehose(list);
  runServer(list);
}

run();