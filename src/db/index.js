// @ts-check

const SqliteDb = require('better-sqlite3')
const { Kysely, Migrator, SqliteDialect } = require('kysely')
const migrationProvider = require('./migrations')

/**
 * @param {string} location
 */
const createDb = (location) => {
  return new Kysely({
    dialect: new SqliteDialect({
      database: new SqliteDb(location),
    }),
  })
}

/**
 * @param {Database} db
 */
const migrateToLatest = async (db) => {
  const migrator = new Migrator({ db, provider: migrationProvider })
  const { error } = await migrator.migrateToLatest()
  if (error) throw error
}

module.exports = {
  createDb,
  migrateToLatest
}
