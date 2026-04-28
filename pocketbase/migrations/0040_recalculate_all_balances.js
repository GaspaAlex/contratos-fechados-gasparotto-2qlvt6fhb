migrate(
  (app) => {
    const timeToMinutes = (timeStr) => {
      if (!timeStr) return 0
      const parts = timeStr.split(':')
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
    }

    const records = app.findRecordsByFilter('registros', 'id != ""', '', 10000, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const cargaMap = {}

    for (let record of records) {
      const funcId = record.get('funcionario_id')
      if (!cargaMap[funcId]) {
        try {
          const f = app.findRecordById('funcionarios', funcId)
          cargaMap[funcId] = f.get('carga_diaria') || 480
        } catch (e) {
          cargaMap[funcId] = 480
        }
      }
      const cargaMins = cargaMap[funcId]

      const dStr = record.get('data')
      const recDate = new Date(dStr)
      recDate.setHours(0, 0, 0, 0)

      const isTodayOrFuture = recDate.getTime() >= today.getTime()

      const e1 = record.get('entrada1')
      const s1 = record.get('saida1')
      const e2 = record.get('entrada2')
      const s2 = record.get('saida2')

      let hTrab = 0
      if (e1 && s1) hTrab += Math.max(0, timeToMinutes(s1) - timeToMinutes(e1))
      if (e2 && s2) hTrab += Math.max(0, timeToMinutes(s2) - timeToMinutes(e2))

      let tipoDia = record.get('tipo_dia') || 'normal'
      const hasNoHours = !e1 && !s1 && !e2 && !s2

      let saldo = 0

      const dateOnly = recDate.toISOString().split('T')[0]
      if (dateOnly === '2026-04-17') {
        tipoDia = 'atestado'
        saldo = 0
      } else if (dateOnly === '2026-04-20') {
        tipoDia = 'falta'
        saldo = -cargaMins
      } else if (dateOnly === '2026-04-21') {
        tipoDia = 'feriado'
        saldo = 0
      } else {
        if (tipoDia === 'normal') {
          if (hasNoHours) {
            if (isTodayOrFuture) {
              saldo = 0
            } else {
              saldo = -cargaMins
              tipoDia = 'falta'
            }
          } else {
            saldo = hTrab - cargaMins
          }
        } else if (tipoDia === 'falta') {
          if (!hasNoHours) {
            tipoDia = 'normal'
            saldo = hTrab - cargaMins
          } else {
            saldo = -cargaMins
          }
        } else if (tipoDia === 'feriado') {
          saldo = 0
        } else if (tipoDia === 'atestado') {
          saldo = 0
        } else if (tipoDia === 'fim_de_semana') {
          saldo = hTrab
        }
      }

      record.set('horas_trabalhadas', hTrab)
      record.set('saldo_dia', saldo)
      record.set('tipo_dia', tipoDia)

      app.saveNoValidate(record)
    }

    const saldos = app.findRecordsByFilter('saldos_mensais', 'id != ""', '', 10000, 0)
    for (let saldoRec of saldos) {
      const funcId = saldoRec.get('funcionario_id')
      const mes = saldoRec.get('mes')
      const ano = saldoRec.get('ano')

      const startStr = `${ano}-${String(mes).padStart(2, '0')}-01`
      const endStr = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()} 23:59:59`

      const monthRecords = app.findRecordsByFilter(
        'registros',
        `funcionario_id = '${funcId}' && data >= '${startStr}' && data <= '${endStr}'`,
        '',
        10000,
        0,
      )
      let saldoMes = 0
      for (let r of monthRecords) {
        saldoMes += r.get('saldo_dia') || 0
      }

      saldoRec.set('saldo_mes', saldoMes)
      const saldoAnterior = saldoRec.get('saldo_anterior') || 0
      saldoRec.set('saldo_total', saldoAnterior + saldoMes)

      app.saveNoValidate(saldoRec)
    }
  },
  (app) => {
    // down migration not required for data fix
  },
)
