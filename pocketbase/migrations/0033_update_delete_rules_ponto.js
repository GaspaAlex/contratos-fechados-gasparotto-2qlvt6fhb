migrate(
  (app) => {
    const collections = ['funcionarios', 'registros', 'saldos_mensais']
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.deleteRule = "@request.auth.id != ''"
        app.save(col)
      } catch (err) {
        console.log('Migration 0033: skipping collection ' + name, err)
      }
    }
  },
  (app) => {
    // Revert logic omitted as prior rules may vary
  },
)
