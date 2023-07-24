// @ts-check

/** @type {Record<string, import('kysely').Migration>} */
const migrations = {}

/** @type {import('kysely').MigrationProvider} */
const migrationProvider = {
  async getMigrations() {
    return migrations
  },
}

migrations['001'] = {
  async up(/** @type {import('kysely').Kysely<unknown>} */db) {
    await db.schema
      .createTable('post')
      .addColumn('uri', 'varchar', (col) => col.primaryKey())
      .addColumn('cid', 'varchar', (col) => col.notNull())
      .addColumn('replyParent', 'varchar')
      .addColumn('replyRoot', 'varchar')
      .addColumn('indexedAt', 'varchar', (col) => col.notNull())
      .execute()
    await db.schema
      .createTable('sub_state')
      .addColumn('service', 'varchar', (col) => col.primaryKey())
      .addColumn('cursor', 'integer', (col) => col.notNull())
      .execute()
  },
  async down(/** @type {import('kysely').Kysely<unknown>} */db) {
    await db.schema.dropTable('post').execute()
    await db.schema.dropTable('sub_state').execute()
  },
}

module.exports = migrationProvider;
