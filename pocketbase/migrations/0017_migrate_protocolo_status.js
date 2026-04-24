migrate(
  (app) => {
    app
      .db()
      .newQuery(`
    UPDATE protocolo 
    SET status = 'Protocolado Judicial' 
    WHERE status = 'Protocolado'
  `)
      .execute()
  },
  (app) => {
    app
      .db()
      .newQuery(`
    UPDATE protocolo 
    SET status = 'Protocolado' 
    WHERE status = 'Protocolado Judicial'
  `)
      .execute()
  },
)
