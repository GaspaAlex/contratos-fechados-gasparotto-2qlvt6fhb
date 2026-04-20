migrate(
  (app) => {
    if (!app.hasTable('pericias')) {
      const collection = new Collection({
        name: 'pericias',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'nautos', type: 'text', required: true },
          { name: 'data', type: 'date', required: true },
          { name: 'horario', type: 'text' },
          { name: 'endereco', type: 'text' },
          { name: 'perito', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['Agendado', 'Pendente', 'Cancelado'],
            maxSelect: 1,
          },
          {
            name: 'compareceu',
            type: 'select',
            values: ['Sim', 'Não', 'Não realizada'],
            maxSelect: 1,
          },
          {
            name: 'laudo',
            type: 'select',
            values: ['Favorável', 'Desfavorável', 'Aguardando'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(collection)
    }

    const seedData = [
      {
        nome: 'João da Silva',
        nautos: '0001234-56.2026.8.16.0001',
        data: '2026-03-15 10:00:00.000Z',
        horario: '10:00',
        endereco: 'Rua das Flores, 123',
        perito: 'Dr. Roberto',
        status: 'Agendado',
        compareceu: 'Não realizada',
        laudo: 'Aguardando',
      },
      {
        nome: 'Maria Oliveira',
        nautos: '0005678-90.2026.8.16.0001',
        data: '2026-03-20 14:30:00.000Z',
        horario: '14:30',
        endereco: 'Av. Central, 456',
        perito: 'Dra. Ana',
        status: 'Agendado',
        compareceu: 'Sim',
        laudo: 'Favorável',
      },
      {
        nome: 'Carlos Pereira',
        nautos: '0009012-34.2026.8.16.0001',
        data: '2026-05-10 09:00:00.000Z',
        horario: '09:00',
        endereco: 'Rua do Sol, 789',
        perito: 'Dr. Roberto',
        status: 'Pendente',
        compareceu: 'Não realizada',
        laudo: 'Aguardando',
      },
      {
        nome: 'Ana Santos',
        nautos: '0003456-78.2026.8.16.0001',
        data: '2026-05-18 11:15:00.000Z',
        horario: '11:15',
        endereco: 'Av. Norte, 101',
        perito: 'Dr. João',
        status: 'Pendente',
        compareceu: 'Não',
        laudo: 'Desfavorável',
      },
      {
        nome: 'Roberto Alves',
        nautos: '0007890-12.2026.8.16.0001',
        data: '2026-05-25 16:00:00.000Z',
        horario: '16:00',
        endereco: 'Rua Sul, 202',
        perito: 'Dra. Ana',
        status: 'Cancelado',
        compareceu: 'Não realizada',
        laudo: 'Aguardando',
      },
    ]

    const col = app.findCollectionByNameOrId('pericias')
    for (const data of seedData) {
      try {
        app.findFirstRecordByData('pericias', 'nautos', data.nautos)
      } catch (_) {
        const record = new Record(col)
        record.set('nome', data.nome)
        record.set('nautos', data.nautos)
        record.set('data', data.data)
        record.set('horario', data.horario)
        record.set('endereco', data.endereco)
        record.set('perito', data.perito)
        record.set('status', data.status)
        record.set('compareceu', data.compareceu)
        record.set('laudo', data.laudo)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('pericias')
      app.delete(collection)
    } catch (_) {}
  },
)
