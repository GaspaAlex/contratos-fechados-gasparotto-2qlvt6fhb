migrate(
  (app) => {
    const collection = new Collection({
      name: 'contratos_fechados',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'fone', type: 'text' },
        { name: 'beneficio', type: 'text' },
        { name: 'responsavel', type: 'text' },
        { name: 'fup', type: 'bool' },
        { name: 'status', type: 'text' },
        { name: 'dcontrato', type: 'date', required: true },
        { name: 'dcalculo', type: 'date' },
        { name: 'prazo', type: 'number' },
        { name: 'dprotocolo', type: 'date' },
        { name: 'parceria', type: 'bool' },
        { name: 'parceiro_nome', type: 'text' },
        { name: 'parceiro_comissao', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('contratos_fechados')
    app.delete(collection)
  },
)
