migrate(
  (app) => {
    const col = new Collection({
      name: 'leads_diarios',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'mes', type: 'text', required: true },
        { name: 'dia', type: 'number', required: true },
        { name: 'meta', type: 'number' },
        { name: 'google', type: 'number' },
        { name: 'particular', type: 'number' },
        { name: 'em_qualif', type: 'number' },
        { name: 'sem_qualidade', type: 'number' },
        { name: 'aposentado', type: 'number' },
        { name: 'contribuinte_carne', type: 'number' },
        { name: 'outros', type: 'number' },
        { name: 'fechado_direto', type: 'number' },
        { name: 'fechado_fup', type: 'number' },
        { name: 'fup_ativo', type: 'number' },
        { name: 'investimento', type: 'number' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')
    app.delete(col)
  },
)
