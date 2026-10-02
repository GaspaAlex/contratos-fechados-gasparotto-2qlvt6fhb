migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('protocolo')
    if (!col.fields.getByName('observacoes')) {
      col.fields.add(new TextField({ name: 'observacoes' }))
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('protocolo')
      const observacoesField = col.fields.getByName('observacoes')
      if (observacoesField) {
        col.fields.remove(observacoesField)
        app.save(col)
      }
    } catch (_) {}
  },
)
