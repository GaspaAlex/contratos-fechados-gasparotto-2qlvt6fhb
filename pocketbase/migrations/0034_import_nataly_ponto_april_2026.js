migrate(
  (app) => {
    const funcName = 'Nataly Tayna Figueiredo da Silva'
    let funcRecord
    try {
      funcRecord = app.findFirstRecordByData('funcionarios', 'nome', funcName)
    } catch (_) {
      return // Employee not found, skip migration
    }

    const saldosCol = app.findCollectionByNameOrId('saldos_mensais')
    let saldoRecord
    try {
      saldoRecord = app.findFirstRecordByFilter(
        'saldos_mensais',
        `funcionario_id = '${funcRecord.id}' && mes = 4 && ano = 2026`,
      )
    } catch (_) {
      saldoRecord = new Record(saldosCol)
      saldoRecord.set('funcionario_id', funcRecord.id)
      saldoRecord.set('mes', 4)
      saldoRecord.set('ano', 2026)
    }

    // Step 1: Initial balance setup
    saldoRecord.set('saldo_anterior', 628)
    saldoRecord.set('saldo_mes', 0)
    saldoRecord.set('saldo_total', 628)
    app.save(saldoRecord)

    const dias = [
      {
        data: '2026-04-01',
        dia_semana: 'Quarta-feira',
        e1: '08:05',
        s1: '16:22',
        e2: '',
        s2: '',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-02',
        dia_semana: 'Quinta-feira',
        e1: '08:00',
        s1: '15:30',
        e2: '16:00',
        s2: '17:00',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-06',
        dia_semana: 'Segunda-feira',
        e1: '09:44',
        s1: '15:00',
        e2: '16:21',
        s2: '17:30',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-07',
        dia_semana: 'Terça-feira',
        e1: '08:12',
        s1: '12:00',
        e2: '12:30',
        s2: '16:42',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-08',
        dia_semana: 'Quarta-feira',
        e1: '07:59',
        s1: '12:00',
        e2: '12:30',
        s2: '16:33',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-09',
        dia_semana: 'Quinta-feira',
        e1: '08:00',
        s1: '12:00',
        e2: '12:30',
        s2: '16:34',
        tipo: 'atestado',
        just: 'Atestado 1/2 período',
      },
      {
        data: '2026-04-10',
        dia_semana: 'Sexta-feira',
        e1: '08:00',
        s1: '14:50',
        e2: '16:15',
        s2: '17:30',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-13',
        dia_semana: 'Segunda-feira',
        e1: '07:50',
        s1: '12:30',
        e2: '13:00',
        s2: '16:36',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-14',
        dia_semana: 'Terça-feira',
        e1: '07:55',
        s1: '12:30',
        e2: '13:00',
        s2: '16:59',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-15',
        dia_semana: 'Quarta-feira',
        e1: '07:50',
        s1: '13:00',
        e2: '13:30',
        s2: '16:36',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-16',
        dia_semana: 'Quinta-feira',
        e1: '07:50',
        s1: '12:00',
        e2: '12:30',
        s2: '16:30',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-17',
        dia_semana: 'Sexta-feira',
        e1: '07:50',
        s1: '12:30',
        e2: '13:00',
        s2: '16:30',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-20',
        dia_semana: 'Segunda-feira',
        e1: '08:00',
        s1: '14:40',
        e2: '15:10',
        s2: '16:47',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-22',
        dia_semana: 'Quarta-feira',
        e1: '07:55',
        s1: '13:00',
        e2: '13:30',
        s2: '16:40',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-23',
        dia_semana: 'Quinta-feira',
        e1: '08:20',
        s1: '12:30',
        e2: '13:00',
        s2: '16:40',
        tipo: 'normal',
        just: '',
      },
      {
        data: '2026-04-24',
        dia_semana: 'Sexta-feira',
        e1: '08:04',
        s1: '12:00',
        e2: '12:30',
        s2: '16:34',
        tipo: 'normal',
        just: '',
      },
    ]

    const calcMin = (h1, h2) => {
      if (!h1 || !h2) return 0
      const [h1h, h1m] = h1.split(':').map(Number)
      const [h2h, h2m] = h2.split(':').map(Number)
      return h2h * 60 + h2m - (h1h * 60 + h1m)
    }

    const registrosCol = app.findCollectionByNameOrId('registros')
    let saldoMesTotal = 0

    // Step 2: Insert daily records
    for (const d of dias) {
      const mins1 = calcMin(d.e1, d.s1)
      const mins2 = calcMin(d.e2, d.s2)
      const trab = mins1 + mins2
      const sdia = d.tipo === 'atestado' ? 0 : trab - 480
      saldoMesTotal += sdia

      let reg
      try {
        reg = app.findFirstRecordByFilter(
          'registros',
          `funcionario_id = '${funcRecord.id}' && data >= '${d.data} 00:00:00' && data <= '${d.data} 23:59:59'`,
        )
      } catch (_) {
        reg = new Record(registrosCol)
        reg.set('funcionario_id', funcRecord.id)
        reg.set('data', d.data + ' 12:00:00.000Z')
      }

      reg.set('dia_semana', d.dia_semana)
      reg.set('entrada1', d.e1)
      reg.set('saida1', d.s1)
      reg.set('entrada2', d.e2)
      reg.set('saida2', d.s2)
      reg.set('horas_trabalhadas', trab)
      reg.set('saldo_dia', sdia)
      reg.set('tipo_dia', d.tipo)
      reg.set('justificativa', d.just)
      reg.set('horas_atestado', d.tipo === 'atestado' ? 480 : 0)

      app.save(reg)
    }

    // Step 3: Final balance calculation
    saldoRecord.set('saldo_mes', saldoMesTotal)
    saldoRecord.set('saldo_total', 628 + saldoMesTotal)
    app.save(saldoRecord)
  },
  (app) => {
    const funcName = 'Nataly Tayna Figueiredo da Silva'
    let funcRecord
    try {
      funcRecord = app.findFirstRecordByData('funcionarios', 'nome', funcName)
    } catch (_) {
      return
    }

    // Delete records for April 2026
    const registros = app.findRecordsByFilter(
      'registros',
      `funcionario_id = '${funcRecord.id}' && data >= '2026-04-01 00:00:00' && data <= '2026-04-30 23:59:59'`,
      '',
      100,
      0,
    )
    for (const r of registros) {
      app.delete(r)
    }

    // Delete the monthly balance record
    try {
      const saldo = app.findFirstRecordByFilter(
        'saldos_mensais',
        `funcionario_id = '${funcRecord.id}' && mes = 4 && ano = 2026`,
      )
      app.delete(saldo)
    } catch (_) {}
  },
)
