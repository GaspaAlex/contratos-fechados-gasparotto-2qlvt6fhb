migrate(
  (app) => {
    const contratosCol = app.findCollectionByNameOrId('contratos_fechados')

    const collection = new Collection({
      name: 'emails_revisao_enviados',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'contrato_id',
          type: 'relation',
          required: true,
          collectionId: contratosCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'revisar_em',
          type: 'date',
          required: true,
        },
        {
          name: 'status_envio',
          type: 'select',
          required: true,
          values: ['pendente', 'enviado', 'erro'],
          maxSelect: 1,
        },
        {
          name: 'tentativa_em',
          type: 'date',
        },
        {
          name: 'enviado_em',
          type: 'date',
        },
        {
          name: 'erro',
          type: 'text',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_emails_revisao_contrato_data ON emails_revisao_enviados (contrato_id, revisar_em)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('emails_revisao_enviados')
      app.delete(collection)
    } catch (_) {}
  },
)
