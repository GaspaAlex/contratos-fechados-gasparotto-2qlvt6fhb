migrate(
  (app) => {
    // 1. Update target employees' carga_diaria to 480 minutes
    try {
      const funcionarios = app.findRecordsByFilter(
        'funcionarios',
        "nome ~ 'Nataly' || nome ~ 'Giulianna'",
        '',
        10,
        0,
      )
      for (const f of funcionarios) {
        f.set('carga_diaria', 480)
        app.save(f)
      }
    } catch (e) {
      // If no users match, skip
    }

    // 2. Recalculate past records for Nataly
    try {
      const nataly = app.findFirstRecordByFilter(
        'funcionarios',
        "nome ~ 'Nataly Tayna Figueiredo da Silva'",
      )
      if (nataly) {
        const registros = app.findRecordsByFilter(
          'registros',
          `funcionario_id = '${nataly.id}'`,
          '',
          1000,
          0,
        )

        let saldoMes = 0

        for (const r of registros) {
          const e1 = r.getString('entrada1')
          const s1 = r.getString('saida1')
          const e2 = r.getString('entrada2')
          const s2 = r.getString('saida2')
          const tipo = r.getString('tipo_dia')
          const dataStr = r.getString('data')

          // Calculate worked minutes directly inline (matching central util logic)
          let worked = 0
          const t2m = (t) => {
            if (!t) return 0
            const [h, m] = t.split(':').map(Number)
            return h * 60 + m
          }
          if (e1 && s1) worked += Math.max(0, t2m(s1) - t2m(e1))
          if (e2 && s2) worked += Math.max(0, t2m(s2) - t2m(e2))

          let saldo = 0
          const carga = 480

          if (tipo === 'normal') {
            saldo = worked - carga
          } else if (tipo === 'falta') {
            saldo = -carga
          } else if (tipo === 'feriado') {
            saldo = worked > 0 ? worked : 0
          } else if (tipo === 'atestado') {
            const ha = r.getFloat('horas_atestado') || 0
            if (ha === 0 && worked === 0) {
              saldo = 0
            } else {
              saldo = worked + ha * 60 - carga
            }
          }

          r.set('horas_trabalhadas', worked)
          r.set('saldo_dia', saldo)
          app.save(r)

          if (dataStr.startsWith('2026-04')) {
            saldoMes += saldo
          }
        }

        // 3. Update monthly balance for April 2026
        try {
          const sm = app.findFirstRecordByFilter(
            'saldos_mensais',
            `funcionario_id = '${nataly.id}' && mes = 4 && ano = 2026`,
          )
          if (sm) {
            sm.set('saldo_mes', saldoMes)
            sm.set('saldo_total', sm.getFloat('saldo_anterior') + saldoMes)
            app.save(sm)
          }
        } catch (e) {}
      }
    } catch (e) {
      // Graceful fail if Nataly record is completely missing
    }
  },
  (app) => {
    // Revert back to 8 hours representation if undone
    try {
      const funcionarios = app.findRecordsByFilter(
        'funcionarios',
        "nome ~ 'Nataly' || nome ~ 'Giulianna'",
        '',
        10,
        0,
      )
      for (const f of funcionarios) {
        f.set('carga_diaria', 8)
        app.save(f)
      }
    } catch (e) {}
  },
)
