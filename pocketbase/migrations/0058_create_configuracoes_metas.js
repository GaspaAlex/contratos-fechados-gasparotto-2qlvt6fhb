migrate(
  (app) => {
    const col = new Collection({
      name: 'configuracoes_metas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'slug', type: 'text', required: true },
        { name: 'rotulo', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(col)

    const configs = [
      { slug: 'meta_c1', rotulo: 'Aux. Acidente', ativo: true, ordem: 1 },
      { slug: 'meta_c2', rotulo: 'DER', ativo: true, ordem: 2 },
      { slug: 'meta_c3', rotulo: 'Ben. Análise', ativo: true, ordem: 3 },
      { slug: 'meta_c4', rotulo: '', ativo: false, ordem: 4 },
      { slug: 'meta_c5', rotulo: '', ativo: false, ordem: 5 },
    ]

    const savedCol = app.findCollectionByNameOrId('configuracoes_metas')
    for (const c of configs) {
      const record = new Record(savedCol)
      record.set('slug', c.slug)
      record.set('rotulo', c.rotulo)
      record.set('ativo', c.ativo)
      record.set('ordem', c.ordem)
      app.save(record)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_metas')
    app.delete(col)
  },
)
