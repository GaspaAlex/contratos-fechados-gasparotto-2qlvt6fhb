migrate(
  (app) => {
    let funcionario
    try {
      funcionario = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Giulianna dos Santos Assolini',
      )
    } catch (e) {
      const col = app.findCollectionByNameOrId('funcionarios')
      funcionario = new Record(col)
      funcionario.set('nome', 'Giulianna dos Santos Assolini')
      funcionario.set('pin', '1234')
      funcionario.set('perfil', 'funcionaria')
      funcionario.set('carga_diaria', 480)
      app.save(funcionario)
    }

    const funcionarioId = funcionario.id

    const saldosCol = app.findCollectionByNameOrId('saldos_mensais')
    const existingSaldos = app.findRecordsByFilter(
      'saldos_mensais',
      `funcionario_id = '${funcionarioId}' && mes = 4 && ano = 2026`,
      '',
      1,
      0,
    )

    let saldoRecord
    if (existingSaldos.length > 0) {
      saldoRecord = existingSaldos[0]
    } else {
      saldoRecord = new Record(saldosCol)
      saldoRecord.set('funcionario_id', funcionarioId)
      saldoRecord.set('mes', 4)
      saldoRecord.set('ano', 2026)
      saldoRecord.set('saldo_anterior', 227)
      saldoRecord.set('saldo_mes', 0)
      saldoRecord.set('saldo_total', 227)
      saldoRecord.set('fechado', false)
      app.save(saldoRecord)
    }

    const records = [
      {
        data: '2026-04-01 12:00:00.000Z',
        dia_semana: 'quarta',
        entrada1: '07:58',
        saida1: '13:00',
        entrada2: '14:25',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-02 12:00:00.000Z',
        dia_semana: 'quinta',
        entrada1: '07:58',
        saida1: '13:00',
        entrada2: '14:22',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-06 12:00:00.000Z',
        dia_semana: 'segunda',
        entrada1: '07:56',
        saida1: '13:02',
        entrada2: '14:15',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-07 12:00:00.000Z',
        dia_semana: 'terça',
        entrada1: '07:57',
        saida1: '13:00',
        entrada2: '14:14',
        saida2: '17:38',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-08 12:00:00.000Z',
        dia_semana: 'quarta',
        entrada1: '07:55',
        saida1: '13:03',
        entrada2: '14:14',
        saida2: '17:40',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-09 12:00:00.000Z',
        dia_semana: 'quinta',
        entrada1: '07:56',
        saida1: '13:07',
        entrada2: '14:30',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-10 12:00:00.000Z',
        dia_semana: 'sexta',
        entrada1: '07:55',
        saida1: '13:10',
        entrada2: '14:22',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-13 12:00:00.000Z',
        dia_semana: 'segunda',
        entrada1: '07:56',
        saida1: '13:05',
        entrada2: '14:20',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-14 12:00:00.000Z',
        dia_semana: 'terça',
        entrada1: '07:55',
        saida1: '13:01',
        entrada2: '14:18',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-15 12:00:00.000Z',
        dia_semana: 'quarta',
        entrada1: '07:50',
        saida1: '13:20',
        entrada2: '14:37',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-16 12:00:00.000Z',
        dia_semana: 'quinta',
        entrada1: '07:55',
        saida1: '13:00',
        entrada2: '14:15',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-17 12:00:00.000Z',
        dia_semana: 'sexta',
        entrada1: '06:50',
        saida1: '13:00',
        entrada2: '14:00',
        saida2: '15:50',
        tipo_dia: 'atestado',
        justificativa: 'Atestado 1/2 período',
      },
      { data: '2026-04-20 12:00:00.000Z', dia_semana: 'segunda', tipo_dia: 'falta' },
      {
        data: '2026-04-22 12:00:00.000Z',
        dia_semana: 'quarta',
        entrada1: '07:58',
        saida1: '13:00',
        entrada2: '14:24',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-23 12:00:00.000Z',
        dia_semana: 'quinta',
        entrada1: '07:56',
        saida1: '13:05',
        entrada2: '14:25',
        saida2: '17:35',
        tipo_dia: 'normal',
      },
      {
        data: '2026-04-24 12:00:00.000Z',
        dia_semana: 'sexta',
        entrada1: '07:50',
        saida1: '13:06',
        entrada2: '14:30',
        saida2: '17:30',
        tipo_dia: 'normal',
      },
    ]

    const registrosCol = app.findCollectionByNameOrId('registros')
    let totalSaldoMes = 0

    for (const r of records) {
      let worked = 0

      const timeToMins = (t) => {
        if (!t) return 0
        const pts = t.split(':')
        return parseInt(pts[0], 10) * 60 + parseInt(pts[1], 10)
      }

      if (r.entrada1 && r.saida1) {
        worked += timeToMins(r.saida1) - timeToMins(r.entrada1)
      }
      if (r.entrada2 && r.saida2) {
        worked += timeToMins(r.saida2) - timeToMins(r.entrada2)
      }

      let saldoDia = 0
      if (r.tipo_dia === 'atestado' || r.tipo_dia === 'feriado') {
        saldoDia = 0
      } else if (r.tipo_dia === 'falta') {
        saldoDia = -480
      } else {
        saldoDia = worked - 480
      }

      totalSaldoMes += saldoDia

      const startOfDay = r.data.split(' ')[0] + ' 00:00:00.000Z'
      const endOfDay = r.data.split(' ')[0] + ' 23:59:59.999Z'

      const existingRegs = app.findRecordsByFilter(
        'registros',
        `funcionario_id = '${funcionarioId}' && data >= '${startOfDay}' && data <= '${endOfDay}'`,
        '',
        1,
        0,
      )

      let reg
      if (existingRegs.length > 0) {
        reg = existingRegs[0]
      } else {
        reg = new Record(registrosCol)
        reg.set('funcionario_id', funcionarioId)
        reg.set('data', r.data)
      }

      reg.set('dia_semana', r.dia_semana)
      reg.set('entrada1', r.entrada1 || '')
      reg.set('saida1', r.saida1 || '')
      reg.set('entrada2', r.entrada2 || '')
      reg.set('saida2', r.saida2 || '')
      reg.set('horas_trabalhadas', worked)
      reg.set('saldo_dia', saldoDia)
      reg.set('tipo_dia', r.tipo_dia)
      if (r.justificativa) reg.set('justificativa', r.justificativa)

      app.save(reg)
    }

    saldoRecord.set('saldo_mes', totalSaldoMes)
    saldoRecord.set('saldo_total', 227 + totalSaldoMes)
    app.save(saldoRecord)
  },
  (app) => {
    let funcionario
    try {
      funcionario = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Giulianna dos Santos Assolini',
      )
    } catch (e) {
      return
    }

    const records = app.findRecordsByFilter(
      'registros',
      `funcionario_id = '${funcionario.id}' && data >= '2026-04-01 00:00:00.000Z' && data <= '2026-04-30 23:59:59.999Z'`,
      '',
      100,
      0,
    )

    for (const r of records) {
      app.delete(r)
    }

    const existingSaldos = app.findRecordsByFilter(
      'saldos_mensais',
      `funcionario_id = '${funcionario.id}' && mes = 4 && ano = 2026`,
      '',
      1,
      0,
    )

    if (existingSaldos.length > 0) {
      app.delete(existingSaldos[0])
    }
  },
)
