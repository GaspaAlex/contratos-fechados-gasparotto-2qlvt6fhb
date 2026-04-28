migrate(
  (app) => {
    let nataly
    try {
      nataly = app.findFirstRecordByData('funcionarios', 'nome', 'Nataly Tayna Figueiredo da Silva')
    } catch (_) {
      return // employee not found, skip
    }

    // 1. Correct daily workload
    nataly.set('carga_diaria', 480)
    app.save(nataly)

    // 2. Fetch daily records for April 2026
    const registros = app.findRecordsByFilter(
      'registros',
      "funcionario_id = '" + nataly.id + "' && data >= '2026-04-01' && data < '2026-05-01'",
      'data',
      100,
      0,
    )

    function timeToMins(t) {
      if (!t) return 0
      const parts = t.split(':')
      if (parts.length < 2) return 0
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
    }

    let saldo_mes = 0

    // Recalculate each daily record
    for (const reg of registros) {
      const dateStr = reg.getString('data').substring(0, 10)
      const e1 = reg.getString('entrada1')
      const s1 = reg.getString('saida1')
      const e2 = reg.getString('entrada2')
      const s2 = reg.getString('saida2')
      let tipo = reg.getString('tipo_dia')

      // Mandatory exceptions
      if (dateStr === '2026-04-09') tipo = 'atestado'
      if (dateStr === '2026-04-21') tipo = 'feriado'

      const hasTimestamps = e1 || s1 || e2 || s2
      let saldo = 0

      if (tipo === 'atestado' || tipo === 'feriado') {
        saldo = 0
      } else if (tipo === 'fim_de_semana') {
        if (hasTimestamps) {
          saldo = timeToMins(s1) - timeToMins(e1) + (timeToMins(s2) - timeToMins(e2))
        } else {
          saldo = 0
        }
      } else {
        if (!hasTimestamps) {
          if (dateStr >= '2026-04-28') {
            // Today or Future without timestamps
            saldo = 0
          } else {
            // Past without timestamps
            tipo = 'falta'
            saldo = -480
          }
        } else {
          tipo = 'normal'
          saldo = timeToMins(s1) - timeToMins(e1) + (timeToMins(s2) - timeToMins(e2)) - 480
        }
      }

      reg.set('tipo_dia', tipo)
      reg.set('saldo_dia', saldo)
      app.save(reg)

      saldo_mes += saldo
    }

    // 3. Update or create monthly balance for April 2026
    const records = app.findRecordsByFilter(
      'saldos_mensais',
      "funcionario_id = '" + nataly.id + "' && mes = 4 && ano = 2026",
      '',
      1,
      0,
    )

    let saldoMesRecord
    if (records.length > 0) {
      saldoMesRecord = records[0]
    } else {
      const coll = app.findCollectionByNameOrId('saldos_mensais')
      saldoMesRecord = new Record(coll)
      saldoMesRecord.set('funcionario_id', nataly.id)
      saldoMesRecord.set('mes', 4)
      saldoMesRecord.set('ano', 2026)
    }

    saldoMesRecord.set('saldo_anterior', 628)
    saldoMesRecord.set('saldo_mes', saldo_mes)
    saldoMesRecord.set('saldo_total', 628 + saldo_mes)
    app.save(saldoMesRecord)
  },
  (app) => {
    try {
      const nataly = app.findFirstRecordByData(
        'funcionarios',
        'nome',
        'Nataly Tayna Figueiredo da Silva',
      )
      nataly.set('carga_diaria', 510)
      app.save(nataly)
    } catch (_) {}
  },
)
