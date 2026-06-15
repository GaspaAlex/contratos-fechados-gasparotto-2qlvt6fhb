migrate(
  (app) => {
    const collection = new Collection({
      name: 'classificacoes_lead',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'campanha', type: 'text', required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)

    const der = [
      'Qualificado',
      'Contrato Fechado',
      'Prazo Decadencial',
      'Fora do prazo',
      'Revisão em pensão',
      'Revisão',
      'Queria RVT',
      'Outros',
    ]
    const aux = [
      'Qualificado',
      'Contrato Fechado',
      'Sem qualidade',
      'Aposentado',
      'Carnê',
      'Sem interesse',
      'Recebendo aux doença',
      'Não sofreu acidente',
      'Servidor público',
      'Engano',
    ]

    for (const nome of der) {
      const record = new Record(collection)
      record.set('campanha', 'DER')
      record.set('nome', nome)
      app.save(record)
    }

    for (const nome of aux) {
      const record = new Record(collection)
      record.set('campanha', 'AUX. ACIDENTE')
      record.set('nome', nome)
      app.save(record)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('classificacoes_lead')
    app.delete(collection)
  },
)
