// @ts-check

type AppContext = {
  db: Database
  didResolver: import('@atproto/did-resolver').DidResolver
  cfg: Config
}

type Config = {
  port: number
  listenhost: string
  hostname: string
  sqliteLocation: string
  subscriptionEndpoint: string
  serviceDid: string
  publisherDid: string
  subscriptionReconnectDelay: number
}

type Database = Kysely<DatabaseSchema>