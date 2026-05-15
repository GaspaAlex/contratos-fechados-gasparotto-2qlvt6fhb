migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('protocolo')
    col.fields.add(new BoolField({ name: 'representante' }))
    col.fields.add(new TextField({ name: 'representante_nome' }))
    col.fields.add(new TextField({ name: 'representante_cpf' }))
    col.fields.add(new TextField({ name: 'representante_vinculo' }))
    col.fields.add(new TextField({ name: 'representante_telefone' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('protocolo')
    col.fields.removeByName('representante')
    col.fields.removeByName('representante_nome')
    col.fields.removeByName('representante_cpf')
    col.fields.removeByName('representante_vinculo')
    col.fields.removeByName('representante_telefone')
    app.save(col)
  },
)
