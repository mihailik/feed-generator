// @ts-check

const { Subscription } = require('@atproto/xrpc-server')
const { cborToLexRecord, readCar } = require('@atproto/repo')

const ids = {
  ComAtprotoSyncSubscribeRepos: 'com.atproto.sync.subscribeRepos',
  AppBskyFeedPost: 'app.bsky.feed.post',
}

async function run() {
  process.stdout.write('creating subscription...');
  /** @type {number | undefined} */
  let cursor;

  const service = 'wss://bsky.social';
  const sub = new Subscription({
    method: ids.ComAtprotoSyncSubscribeRepos,
    service: service,
    getParams: () => ({cursor}),
    validate: (value) => {
      return value;
      // try {
      //   return lexicons.assertValidXrpcMessage(
      //     ids.ComAtprotoSyncSubscribeRepos,
      //     value,
      //   )
      // } catch (err) {
      //   console.error('repo subscription skipped invalid message', err)
      // }
    },
  });
  console.log(sub);

  console.log('reading subscription:');

  for await (const evt of sub) {
    const ops = await getOpsByType(evt);
    const newPosts = ops.post?.creates;
    if (newPosts?.length) {
      console.log(newPosts.length + ' posts:');
      for (const post of newPosts) {
        console.log('  ' + post.record.text.replace(/\s+/g, ' ').slice(0,50));
      }
    } else {
      // console.log(Object.keys(ops));
    }

    if (evt.seq) {
      cursor = evt.seq;
    }
  }

}

/** @typedef {import('../../lexicon-js/types/com/atproto/sync/subscribeRepos').Commit} Commit */

/**
 * @param {Commit} evt
 */
const getOpsByType = async (evt) => {
  const opsByType = {
    ...evt
  }

  if (!evt.blocks) return opsByType;

  const car = await readCar(evt.blocks)
  /** @type {{[type: string]: { creates: any[], deletes: any[] }} */

  for (const op of evt.ops) {
    const uri = `at://${evt.repo}/${op.path}`
    const [collection] = op.path.split('/')
    const collectionShort = collection.split('.').slice(-1)[0];
    const ops = opsByType[collectionShort] || (
      opsByType[collectionShort] = {creates:[], deletes: []});

    if (op.action === 'update') continue // updates not supported yet

    if (op.action === 'create') {
      if (!op.cid) continue
      const recordBytes = car.blocks.get(op.cid)
      if (!recordBytes) continue
      const record = cborToLexRecord(recordBytes)
      const create = { uri, cid: op.cid.toString(), author: evt.repo }
      ops.creates.push({ record, ...create })
    }

    if (op.action === 'delete') {
      ops.deletes.push({ uri })
    }
  }

  return opsByType
}

run();