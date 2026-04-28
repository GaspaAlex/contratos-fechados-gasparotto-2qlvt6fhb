migrate(
  (app) => {
    let giulianna
    try {
      giulianna = app.findFirstRecordByData('funcionarios', 'nome', 'Giulianna dos Santos Assolini')
    } catch (e) {
      return
    }

    const cargaMins = giulianna.getInt('carga_diaria') || 480

    let saldoMensal
    try {
      const records = app.findRecordsByFilter(
        'saldos_mensais',
        `funcionario_id = '${giulianna.id}' && mes = 4 && ano = 2026`,
        '',
        1,
        0,
      )
      if (records.length > 0) {
        saldoMensal = records[0]
        saldoMensal.set('saldo_anterior', 227)
        app.save(saldoMensal)
      }
    } catch (e) {}

    const start = '2026-04-01 00:00:00'
    const end = '2026-04-30 23:59:59'
    const registros = app.findRecordsByFilter(
      'registros',
      `funcionario_id = '${giulianna.id}' && data >= '${start}' && data <= '${end}'`,
      'data',
      100,
      0,
    )

    let totalMes = 0

    const timeToMins = (t) => {
      if (!t) return 0
      const parts = t.split(':')
      return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0)
    }

    for (const r of registros) {
      const dataStr = r.getString('data').split(' ')[0]
      const dStr = dataStr.substring(0, 10)

      let tipo = r.getString('tipo_dia') || 'normal'
      const e1 = r.getString('entrada1')
      const s1 = r.getString('saida1')
      const e2 = r.getString('entrada2')
      const s2 = r.getString('saida2')
      const hAtestado = r.getFloat('horas_atestado') || 0

      if (dStr === '2026-04-17') {
        tipo = 'atestado'
        r.set('tipo_dia', tipo)
        r.set('saldo_dia', 0)
        app.save(r)
        continue
      }
      if (dStr === '2026-04-20') {
        tipo = 'falta'
        r.set('tipo_dia', tipo)
        r.set('saldo_dia', -480)
        totalMes -= 480
        app.save(r)
        continue
      }
      if (dStr === '2026-04-21') {
        tipo = 'feriado'
        r.set('tipo_dia', tipo)
        r.set('saldo_dia', 0)
        app.save(r)
        continue
      }

      let worked = 0
      if (e1 && s1) worked += Math.max(0, timeToMins(s1) - timeToMins(e1))
      if (e2 && s2) worked += Math.max(0, timeToMins(s2) - timeToMins(e2))

      let saldo = 0

      if (tipo === 'normal') {
        if (!e1 && !s1 && !e2 && !s2) {
          const recDate = new Date(r.getString('data'))
          const now = new Date()
          now.setHours(0, 0, 0, 0)
          recDate.setHours(0, 0, 0, 0)
          if (recDate >= now) {
            saldo = 0
          } else {
            saldo = -cargaMins
          }
        } else {
          saldo = worked - cargaMins
        }
      } else if (tipo === 'falta') {
        saldo = -cargaMins
      } else if (tipo === 'feriado') {
        saldo = 0
      } else if (tipo === 'atestado') {
        if (hAtestado > 0) {
          saldo = worked + hAtestado * 60 - cargaMins
        } else {
          saldo = 0
        }
      } else if (tipo === 'fim_de_semana') {
        saldo = worked
      }

      r.set('horas_trabalhadas', worked)
      r.set('saldo_dia', saldo)
      app.save(r)

      totalMes += saldo
    }

    if (saldoMensal) {
      saldoMensal.set('saldo_mes', totalMes)
      saldoMensal.set('saldo_total', 227 + totalMes)
      app.save(saldoMensal)
    }
  },
  (app) => {},
)
