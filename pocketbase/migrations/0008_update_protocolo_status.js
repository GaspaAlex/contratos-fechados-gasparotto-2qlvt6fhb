migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('protocolo')

    col.fields.add(new TextField({ name: 'status_text' }))
    app.save(col)

    app.db().newQuery('UPDATE protocolo SET status_text = status').execute()

    col.fields.removeByName('status')
    const f = col.fields.getByName('status_text')
    f.name = 'status'
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('protocolo')

    col.fields.add(
      new SelectField({
        name: 'status_select',
        values: ['Protocolado', 'Prov. Inicial', 'R. Docs'],
      }),
    )
    app.save(col)

    app.db().newQuery('UPDATE protocolo SET status_select = status').execute()

    col.fields.removeByName('status')
    const f = col.fields.getByName('status_select')
    f.name = 'status'
    app.save(col)
  },
)
