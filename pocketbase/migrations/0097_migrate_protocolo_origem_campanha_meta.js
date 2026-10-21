migrate(
  (app) => {
    // Backfill idempotente na collection 'protocolo':
    // Renomeia apenas origem = 'Campanha' para 'Campanha Meta'
    app
      .db()
      .newQuery("UPDATE protocolo SET origem = 'Campanha Meta' WHERE origem = 'Campanha'")
      .execute()
  },
  (app) => {
    // Reversão segura
    app
      .db()
      .newQuery("UPDATE protocolo SET origem = 'Campanha' WHERE origem = 'Campanha Meta'")
      .execute()
  },
)
