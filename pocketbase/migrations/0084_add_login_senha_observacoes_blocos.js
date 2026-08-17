migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('acessos_blocos')

    if (!col.fields.getByName('login')) {
      col.fields.add(new TextField({ name: 'login' }))
    }
    if (!col.fields.getByName('senha')) {
      col.fields.add(new TextField({ name: 'senha' }))
    }
    if (!col.fields.getByName('observacoes')) {
      col.fields.add(new TextField({ name: 'observacoes' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('acessos_blocos')

    const loginField = col.fields.getByName('login')
    if (loginField) {
      col.fields.remove(loginField)
    }
    const senhaField = col.fields.getByName('senha')
    if (senhaField) {
      col.fields.remove(senhaField)
    }
    const observacoesField = col.fields.getByName('observacoes')
    if (observacoesField) {
      col.fields.remove(observacoesField)
    }

    app.save(col)
  },
)
