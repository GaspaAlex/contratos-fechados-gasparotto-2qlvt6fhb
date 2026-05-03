migrate(
  (app) => {
    const collection = new Collection({
      name: 'rpv_precatorio',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'cpf', type: 'text', required: true },
        { name: 'numero_processo', type: 'text' },
        { name: 'tipo', type: 'select', values: ['RPV', 'Precatório'], maxSelect: 1 },
        { name: 'valor_rpv', type: 'number' },
        { name: 'sucumbencia', type: 'number' },
        { name: 'status', type: 'text' },
        {
          name: 'tipo_parceria',
          type: 'select',
          values: [
            'Sem parceria',
            'Macohin',
            'Macohin + Rogério',
            'Macohin + Luciana',
            'Carnevale',
          ],
          maxSelect: 1,
        },
        { name: 'previsao_pagamento', type: 'text' },
        { name: 'recebido', type: 'bool' },
        { name: 'data_recebimento', type: 'date' },
        { name: 'valor_recebido', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('rpv_precatorio')
    app.delete(collection)
  },
)
