migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'registros',
        "data >= '2026-05-03 00:00:00.000Z' && data <= '2026-05-03 23:59:59.999Z' && entrada1 = '09:07'",
        '',
        100,
        0,
      )
      for (const record of records) {
        try {
          const funcionario = app.findRecordById('funcionarios', record.get('funcionario_id'))
          if (funcionario && funcionario.get('nome').toLowerCase().includes('kaique')) {
            app.delete(record)
          }
        } catch (err) {
          console.log(err)
        }
      }
    } catch (err) {
      console.log(err)
    }
  },
  (app) => {
    // Irreversível pois não temos os dados exatos de backup do registro excluído
  },
)
