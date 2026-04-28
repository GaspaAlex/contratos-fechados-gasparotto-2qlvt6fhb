migrate(
  (app) => {
    const funcCol = app.findCollectionByNameOrId('funcionarios')
    const regCol = app.findCollectionByNameOrId('registros')
    const saldosCol = app.findCollectionByNameOrId('saldos_mensais')

    let giulianna
    try {
      giulianna = app.findFirstRecordByData('funcionarios', 'nome', 'Giulianna dos Santos Assolini')
    } catch (_) {
      console.log('Giulianna not found, skipping migration.')
      return
    }

    const giuliannaId = giulianna.id

    // 1. Initial Monthly Balance Update
    let saldoRecord
    try {
      saldoRecord = app.findFirstRecordByFilter(
        'saldos_mensais',
        'funcionario_id = {:funcionarioId} && mes = 4 && ano = 2026',
        { funcionarioId: giuliannaId },
      )
    } catch (_) {
      saldoRecord = new Record(saldosCol)
      saldoRecord.set('funcionario_id', giuliannaId)
      saldoRecord.set('mes', 4)
      saldoRecord.set('ano', 2026)
    }

    saldoRecord.set('saldo_anterior', 227)
    saldoRecord.set('saldo_mes', 0)
    saldoRecord.set('saldo_total', 227)
    app.save(saldoRecord)

    // 2. Daily Records Import
    const recordsToInsert = [
      {
        data: '2026-04-01 12:00:00.000Z',
        e1: '07:58',
        s1: '13:00',
        e2: '14:25',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-02 12:00:00.000Z',
        e1: '07:58',
        s1: '13:00',
        e2: '14:22',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-06 12:00:00.000Z',
        e1: '07:56',
        s1: '13:02',
        e2: '14:15',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-07 12:00:00.000Z',
        e1: '07:57',
        s1: '13:00',
        e2: '14:14',
        s2: '17:38',
        tipo: 'normal',
      },
      {
        data: '2026-04-08 12:00:00.000Z',
        e1: '07:55',
        s1: '13:03',
        e2: '14:14',
        s2: '17:40',
        tipo: 'normal',
      },
      {
        data: '2026-04-09 12:00:00.000Z',
        e1: '07:56',
        s1: '13:07',
        e2: '14:30',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-10 12:00:00.000Z',
        e1: '07:55',
        s1: '13:10',
        e2: '14:22',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-13 12:00:00.000Z',
        e1: '07:56',
        s1: '13:05',
        e2: '14:20',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-14 12:00:00.000Z',
        e1: '07:55',
        s1: '13:01',
        e2: '14:18',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-15 12:00:00.000Z',
        e1: '07:50',
        s1: '13:20',
        e2: '14:37',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-16 12:00:00.000Z',
        e1: '07:55',
        s1: '13:00',
        e2: '14:15',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-17 12:00:00.000Z',
        e1: '06:50',
        s1: '13:00',
        e2: '14:00',
        s2: '15:50',
        tipo: 'atestado',
        justificativa: 'Atestado 1/2 período',
      },
      { data: '2026-04-20 12:00:00.000Z', e1: '', s1: '', e2: '', s2: '', tipo: 'falta' },
      {
        data: '2026-04-22 12:00:00.000Z',
        e1: '07:58',
        s1: '13:00',
        e2: '14:24',
        s2: '17:30',
        tipo: 'normal',
      },
      {
        data: '2026-04-23 12:00:00.000Z',
        e1: '07:56',
        s1: '13:05',
        e2: '14:25',
        s2: '17:35',
        tipo: 'normal',
      },
      {
        data: '2026-04-24 12:00:00.000Z',
        e1: '07:50',
        s1: '13:06',
        e2: '14:30',
        s2: '17:30',
        tipo: 'normal',
      },
    ]

    const timeToMins = (t) => {
      if (!t) return 0
      const parts = t.split(':')
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
    }

    const getDiaSemana = (dateStr) => {
      const d = new Date(dateStr.replace(' ', 'T'))
      const days = [
        'Domingo',
        'Segunda-feira',
        'Terça-feira',
        'Quarta-feira',
        'Quinta-feira',
        'Sexta-feira',
        'Sábado',
      ]
      return days[d.getUTCDay()]
    }

    for (const r of recordsToInsert) {
      let horasTrabalhadas = 0
      if (r.e1 && r.s1) horasTrabalhadas += timeToMins(r.s1) - timeToMins(r.e1)
      if (r.e2 && r.s2) horasTrabalhadas += timeToMins(r.s2) - timeToMins(r.e2)

      let saldoDia = 0
      if (r.tipo === 'atestado') {
        saldoDia = 0
      } else if (r.tipo === 'falta') {
        saldoDia = -480
      } else if (r.tipo === 'feriado') {
        saldoDia = 0
      } else {
        saldoDia = horasTrabalhadas - 480
      }

      let reg
      try {
        reg = app.findFirstRecordByFilter(
          'registros',
          'funcionario_id = {:funcionarioId} && data >= {:start} && data <= {:end}',
          {
            funcionarioId: giuliannaId,
            start: r.data.substring(0, 10) + ' 00:00:00.000Z',
            end: r.data.substring(0, 10) + ' 23:59:59.999Z',
          },
        )
      } catch (_) {
        reg = new Record(regCol)
        reg.set('funcionario_id', giuliannaId)
        reg.set('data', r.data)
      }

      reg.set('dia_semana', getDiaSemana(r.data))
      reg.set('entrada1', r.e1)
      reg.set('saida1', r.s1)
      reg.set('entrada2', r.e2)
      reg.set('saida2', r.s2)
      reg.set('horas_trabalhadas', horasTrabalhadas)
      reg.set('saldo_dia', saldoDia)
      reg.set('tipo_dia', r.tipo)
      if (r.justificativa) {
        reg.set('justificativa', r.justificativa)
      }

      app.save(reg)
    }

    // 3. Final Monthly Recalculation
    const allAprilRecords = app.findRecordsByFilter(
      'registros',
      "funcionario_id = {:funcionarioId} && data >= '2026-04-01 00:00:00.000Z' && data <= '2026-04-30 23:59:59.999Z'",
      '',
      100,
      0,
      { funcionarioId: giuliannaId },
    )

    let finalSaldoMes = 0
    for (const rec of allAprilRecords) {
      finalSaldoMes += rec.getInt('saldo_dia')
    }

    saldoRecord.set('saldo_mes', finalSaldoMes)
    saldoRecord.set('saldo_total', 227 + finalSaldoMes)
    app.save(saldoRecord)
  },
  (app) => {
    let giulianna
    try {
      giulianna = app.findFirstRecordByData('funcionarios', 'nome', 'Giulianna dos Santos Assolini')
    } catch (_) {
      return
    }

    const giuliannaId = giulianna.id

    const records = app.findRecordsByFilter(
      'registros',
      "funcionario_id = {:funcionarioId} && data >= '2026-04-01 00:00:00.000Z' && data <= '2026-04-30 23:59:59.999Z'",
      '',
      100,
      0,
      { funcionarioId: giuliannaId },
    )

    for (const record of records) {
      app.delete(record)
    }

    try {
      const saldoRecord = app.findFirstRecordByFilter(
        'saldos_mensais',
        'funcionario_id = {:funcionarioId} && mes = 4 && ano = 2026',
        { funcionarioId: giuliannaId },
      )
      app.delete(saldoRecord)
    } catch (_) {}
  },
)
