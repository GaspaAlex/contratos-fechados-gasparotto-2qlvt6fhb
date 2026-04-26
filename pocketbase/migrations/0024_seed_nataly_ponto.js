migrate(
  (app) => {
    // 1. Employee Lookup
    let funcionario
    try {
      funcionario = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Nataly Tayna Figueiredo da Silva',
      )
    } catch (_) {
      // Create the employee if she doesn't exist to ensure the migration runs successfully end-to-end
      const funcsCol = app.findCollectionByNameOrId('funcionarios')
      funcionario = new Record(funcsCol)
      funcionario.set('nome', 'Nataly Tayna Figueiredo da Silva')
      funcionario.set('pin', '1234')
      funcionario.set('ativo', true)
      funcionario.set('carga_diaria', 480)
      app.save(funcionario)
    }

    // 2. Create or Update Monthly Balance Record
    const saldosCollection = app.findCollectionByNameOrId('saldos_mensais')
    let saldoMensal
    try {
      saldoMensal = app.findFirstRecordByFilter(
        'saldos_mensais',
        `funcionario_id = '${funcionario.id}' && mes = 4 && ano = 2026`,
      )
    } catch (_) {
      saldoMensal = new Record(saldosCollection)
      saldoMensal.set('funcionario_id', funcionario.id)
      saldoMensal.set('mes', 4)
      saldoMensal.set('ano', 2026)
      saldoMensal.set('fechado', false)
    }

    // Set explicit initial values according to requirements
    saldoMensal.set('saldo_anterior', 628)
    saldoMensal.set('saldo_mes', 0)
    saldoMensal.set('saldo_total', 628)
    app.save(saldoMensal)

    // 3. Daily Records Import
    const recordsData = [
      {
        date: '2026-04-01 12:00:00.000Z',
        e1: '08:05',
        s1: '16:22',
        e2: '',
        s2: '',
        type: 'normal',
        d: 'Quarta-feira',
      },
      {
        date: '2026-04-02 12:00:00.000Z',
        e1: '08:00',
        s1: '15:30',
        e2: '16:00',
        s2: '17:00',
        type: 'normal',
        d: 'Quinta-feira',
      },
      {
        date: '2026-04-06 12:00:00.000Z',
        e1: '09:44',
        s1: '15:00',
        e2: '16:21',
        s2: '17:30',
        type: 'normal',
        d: 'Segunda-feira',
      },
      {
        date: '2026-04-07 12:00:00.000Z',
        e1: '08:12',
        s1: '12:00',
        e2: '12:30',
        s2: '16:42',
        type: 'normal',
        d: 'Terça-feira',
      },
      {
        date: '2026-04-08 12:00:00.000Z',
        e1: '07:59',
        s1: '12:00',
        e2: '12:30',
        s2: '16:33',
        type: 'normal',
        d: 'Quarta-feira',
      },
      {
        date: '2026-04-09 12:00:00.000Z',
        e1: '08:00',
        s1: '12:00',
        e2: '12:30',
        s2: '16:34',
        type: 'atestado',
        just: 'Atestado 1/2 período',
        d: 'Quinta-feira',
      },
      {
        date: '2026-04-10 12:00:00.000Z',
        e1: '08:00',
        s1: '14:50',
        e2: '16:15',
        s2: '17:30',
        type: 'normal',
        d: 'Sexta-feira',
      },
      {
        date: '2026-04-13 12:00:00.000Z',
        e1: '07:50',
        s1: '12:30',
        e2: '13:00',
        s2: '16:36',
        type: 'normal',
        d: 'Segunda-feira',
      },
      {
        date: '2026-04-14 12:00:00.000Z',
        e1: '07:55',
        s1: '12:30',
        e2: '13:00',
        s2: '16:59',
        type: 'normal',
        d: 'Terça-feira',
      },
      {
        date: '2026-04-15 12:00:00.000Z',
        e1: '07:50',
        s1: '13:00',
        e2: '13:30',
        s2: '16:36',
        type: 'normal',
        d: 'Quarta-feira',
      },
      {
        date: '2026-04-16 12:00:00.000Z',
        e1: '07:50',
        s1: '12:00',
        e2: '12:30',
        s2: '16:30',
        type: 'normal',
        d: 'Quinta-feira',
      },
      {
        date: '2026-04-17 12:00:00.000Z',
        e1: '07:50',
        s1: '12:30',
        e2: '13:00',
        s2: '16:30',
        type: 'normal',
        d: 'Sexta-feira',
      },
      {
        date: '2026-04-20 12:00:00.000Z',
        e1: '08:00',
        s1: '14:40',
        e2: '15:10',
        s2: '16:47',
        type: 'normal',
        d: 'Segunda-feira',
      },
      {
        date: '2026-04-22 12:00:00.000Z',
        e1: '07:55',
        s1: '13:00',
        e2: '13:30',
        s2: '16:40',
        type: 'normal',
        d: 'Quarta-feira',
      },
      {
        date: '2026-04-23 12:00:00.000Z',
        e1: '08:20',
        s1: '12:30',
        e2: '13:00',
        s2: '16:40',
        type: 'normal',
        d: 'Quinta-feira',
      },
      {
        date: '2026-04-24 12:00:00.000Z',
        e1: '08:04',
        s1: '12:00',
        e2: '12:30',
        s2: '16:34',
        type: 'normal',
        d: 'Sexta-feira',
      },
    ]

    const timeToMins = (t) => {
      if (!t) return 0
      const parts = t.split(':')
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
    }

    const registrosCol = app.findCollectionByNameOrId('registros')
    let saldoMes = 0

    for (const rd of recordsData) {
      let ht = 0
      // Calculate worked hours
      if (rd.e1 && rd.s1) ht += Math.max(0, timeToMins(rd.s1) - timeToMins(rd.e1))
      if (rd.e2 && rd.s2) ht += Math.max(0, timeToMins(rd.s2) - timeToMins(rd.e2))

      const carga = 480 // 8 hours
      let sd = ht - carga

      // Applying exception rules
      if (rd.type === 'atestado' || rd.type === 'feriado') sd = 0
      if (rd.type === 'falta') sd = -carga

      saldoMes += sd

      let reg
      try {
        const datePrefix = rd.date.split(' ')[0]
        reg = app.findFirstRecordByFilter(
          'registros',
          `funcionario_id = '${funcionario.id}' && data >= '${datePrefix} 00:00:00' && data <= '${datePrefix} 23:59:59'`,
        )
      } catch (_) {
        reg = new Record(registrosCol)
        reg.set('funcionario_id', funcionario.id)
        reg.set('data', rd.date)
      }

      reg.set('dia_semana', rd.d)
      reg.set('entrada1', rd.e1)
      reg.set('saida1', rd.s1)
      reg.set('entrada2', rd.e2 || '')
      reg.set('saida2', rd.s2 || '')
      reg.set('horas_trabalhadas', ht)
      reg.set('saldo_dia', sd)
      reg.set('tipo_dia', rd.type)
      if (rd.just) reg.set('justificativa', rd.just)

      app.save(reg)
    }

    // 4. Final Totals Update
    saldoMensal.set('saldo_mes', saldoMes)
    saldoMensal.set('saldo_total', 628 + saldoMes)
    app.save(saldoMensal)
  },
  (app) => {
    let funcionario
    try {
      funcionario = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Nataly Tayna Figueiredo da Silva',
      )
    } catch (_) {
      return
    }

    try {
      const sm = app.findFirstRecordByFilter(
        'saldos_mensais',
        `funcionario_id = '${funcionario.id}' && mes = 4 && ano = 2026`,
      )
      app.delete(sm)
    } catch (_) {}

    const dateStarts = [
      '2026-04-01',
      '2026-04-02',
      '2026-04-06',
      '2026-04-07',
      '2026-04-08',
      '2026-04-09',
      '2026-04-10',
      '2026-04-13',
      '2026-04-14',
      '2026-04-15',
      '2026-04-16',
      '2026-04-17',
      '2026-04-20',
      '2026-04-22',
      '2026-04-23',
      '2026-04-24',
    ]

    for (const ds of dateStarts) {
      try {
        const reg = app.findFirstRecordByFilter(
          'registros',
          `funcionario_id = '${funcionario.id}' && data >= '${ds} 00:00:00' && data <= '${ds} 23:59:59'`,
        )
        app.delete(reg)
      } catch (_) {}
    }
  },
)
