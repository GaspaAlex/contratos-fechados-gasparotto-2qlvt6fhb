migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('rpv_precatorio')

    if (!col.fields.getByName('observacoes')) {
      col.fields.add(new TextField({ name: 'observacoes' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('rpv_precatorio')

    const observacoesField = col.fields.getByName('observacoes')
    if (observacoesField) {
      col.fields.remove(observacoesField)
    }

    app.save(col)
  },
)
