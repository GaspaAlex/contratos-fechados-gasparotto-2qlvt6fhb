migrate(
  (app) => {
    const colTipos = app.findCollectionByNameOrId('tipos_acao')
    const colResp = app.findCollectionByNameOrId('responsaveis')

    const collection = new Collection({
      name: 'protocolo',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'fone', type: 'text' },
        { name: 'tipo_acao', type: 'relation', collectionId: colTipos.id, maxSelect: 1 },
        { name: 'responsavel', type: 'relation', collectionId: colResp.id, maxSelect: 1 },
        {
          name: 'status',
          type: 'select',
          values: ['Protocolado', 'Prov. Inicial', 'R. Docs'],
          maxSelect: 1,
        },
        { name: 'dcalculo', type: 'date' },
        { name: 'dprotocolo', type: 'date' },
        { name: 'prazo', type: 'number' },
        { name: 'nautos', type: 'text' },
        { name: 'valor', type: 'number' },
        {
          name: 'decisao',
          type: 'select',
          values: ['Aguardando', 'Procedente', 'Improcedente'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })

    app.save(collection)

    // Seed Data
    const col = app.findCollectionByNameOrId('protocolo')
    let tipoId = null
    let respId = null

    try {
      const tipos = app.findRecordsByFilter('tipos_acao', '1=1', '', 1, 0)
      if (tipos.length > 0) tipoId = tipos[0].id
      const resps = app.findRecordsByFilter('responsaveis', '1=1', '', 1, 0)
      if (resps.length > 0) respId = resps[0].id
    } catch (e) {}

    const seeds = [
      {
        nome: 'João Silva',
        fone: '11999999999',
        status: 'Protocolado',
        dcalculo: '2026-02-10 12:00:00.000Z',
        dprotocolo: '2026-02-15 12:00:00.000Z',
        prazo: 15,
        nautos: '0001234-56.2026.8.26.0000',
        valor: 50000,
        decisao: 'Aguardando',
      },
      {
        nome: 'Maria Souza',
        fone: '11888888888',
        status: 'Prov. Inicial',
        dcalculo: '2026-03-01 12:00:00.000Z',
        dprotocolo: '2026-03-05 12:00:00.000Z',
        prazo: 15,
        nautos: '0009876-54.2026.8.26.0000',
        valor: 75000,
        decisao: 'Procedente',
      },
      {
        nome: 'Carlos Lima',
        status: 'R. Docs',
        dcalculo: '2026-04-10 12:00:00.000Z',
        dprotocolo: '2026-04-12 12:00:00.000Z',
        prazo: 15,
        nautos: '0005555-33.2026.8.26.0000',
        valor: 30000,
        decisao: 'Improcedente',
      },
    ]

    for (const s of seeds) {
      const r = new Record(col)
      r.set('nome', s.nome)
      if (s.fone) r.set('fone', s.fone)
      r.set('status', s.status)
      r.set('dcalculo', s.dcalculo)
      r.set('dprotocolo', s.dprotocolo)
      r.set('prazo', s.prazo)
      r.set('nautos', s.nautos)
      r.set('valor', s.valor)
      r.set('decisao', s.decisao)
      if (tipoId) r.set('tipo_acao', tipoId)
      if (respId) r.set('responsavel', respId)
      app.save(r)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('protocolo')
    app.delete(collection)
  },
)
