migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('contratos_fechados')
    const records = [
      {
        nome: 'Hércules Lacerda',
        fone: '(11) 99999-9999',
        beneficio: 'Aposentadoria',
        responsavel: 'João',
        fup: true,
        status: 'OK',
        dcontrato: '2026-03-01 12:00:00.000Z',
        dcalculo: '2026-03-05 12:00:00.000Z',
        prazo: 10,
        dprotocolo: '2026-03-15 12:00:00.000Z',
        parceria: false,
        parceiro_nome: '',
        parceiro_comissao: 0,
      },
      {
        nome: 'Ana Livia',
        fone: '(11) 99999-9999',
        beneficio: 'Pensão por Morte',
        responsavel: 'Maria',
        fup: false,
        status: 'OK',
        dcontrato: '2026-03-02 12:00:00.000Z',
        dcalculo: '2026-03-06 12:00:00.000Z',
        prazo: 10,
        dprotocolo: '2026-03-16 12:00:00.000Z',
        parceria: true,
        parceiro_nome: 'Juliana',
        parceiro_comissao: 100,
      },
      {
        nome: 'Felipe Narciso',
        fone: '(11) 99999-9999',
        beneficio: 'Aux. Acidente',
        responsavel: 'João',
        fup: true,
        status: 'OK',
        dcontrato: '2026-03-03 12:00:00.000Z',
        dcalculo: '2026-03-07 12:00:00.000Z',
        prazo: 10,
        dprotocolo: '2026-03-17 12:00:00.000Z',
        parceria: false,
        parceiro_nome: '',
        parceiro_comissao: 0,
      },
      {
        nome: 'Gilton dos Santos',
        fone: '(11) 99999-9999',
        beneficio: 'Aposentadoria',
        responsavel: 'Pedro',
        fup: false,
        status: 'R. Docs',
        dcontrato: '2026-03-04 12:00:00.000Z',
        dcalculo: '',
        prazo: 15,
        dprotocolo: '',
        parceria: true,
        parceiro_nome: 'João',
        parceiro_comissao: 100,
      },
      {
        nome: 'Larissa Veruska',
        fone: '(11) 99999-9999',
        beneficio: 'BPC/LOAS',
        responsavel: 'Maria',
        fup: true,
        status: 'OK',
        dcontrato: '2026-03-05 12:00:00.000Z',
        dcalculo: '2026-03-09 12:00:00.000Z',
        prazo: 10,
        dprotocolo: '2026-03-19 12:00:00.000Z',
        parceria: false,
        parceiro_nome: '',
        parceiro_comissao: 0,
      },
    ]

    for (const data of records) {
      try {
        app.findFirstRecordByData('contratos_fechados', 'nome', data.nome)
      } catch (_) {
        const record = new Record(col)
        for (const [key, value] of Object.entries(data)) {
          if (value !== '') {
            record.set(key, value)
          }
        }
        app.save(record)
      }
    }
  },
  (app) => {
    // Can be handled manually if needed
  },
)
