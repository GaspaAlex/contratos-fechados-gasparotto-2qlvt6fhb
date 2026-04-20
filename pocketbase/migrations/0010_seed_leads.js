migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')
    const year = new Date().getFullYear()
    const seedData = [
      {
        mes: `Janeiro ${year}`,
        dia: 1,
        meta: 10,
        google: 5,
        particular: 2,
        em_qualif: 1,
        sem_qualidade: 1,
        aposentado: 0,
        contribuinte_carne: 0,
        outros: 0,
        fechado_direto: 1,
        fechado_fup: 0,
        fup_ativo: 2,
        investimento: 150.0,
        observacoes: 'Dia bom',
      },
      {
        mes: `Janeiro ${year}`,
        dia: 2,
        meta: 10,
        google: 8,
        particular: 3,
        em_qualif: 2,
        sem_qualidade: 2,
        aposentado: 1,
        contribuinte_carne: 0,
        outros: 0,
        fechado_direto: 2,
        fechado_fup: 1,
        fup_ativo: 3,
        investimento: 200.0,
        observacoes: '',
      },
      {
        mes: `Janeiro ${year}`,
        dia: 3,
        meta: 12,
        google: 10,
        particular: 4,
        em_qualif: 3,
        sem_qualidade: 1,
        aposentado: 2,
        contribuinte_carne: 1,
        outros: 0,
        fechado_direto: 3,
        fechado_fup: 0,
        fup_ativo: 4,
        investimento: 250.0,
        observacoes: 'Alto volume',
      },
      {
        mes: `Fevereiro ${year}`,
        dia: 1,
        meta: 15,
        google: 12,
        particular: 5,
        em_qualif: 4,
        sem_qualidade: 3,
        aposentado: 1,
        contribuinte_carne: 0,
        outros: 1,
        fechado_direto: 4,
        fechado_fup: 2,
        fup_ativo: 5,
        investimento: 300.0,
        observacoes: 'Início do mês',
      },
    ]

    for (const d of seedData) {
      try {
        app.findFirstRecordByFilter('leads_diarios', `mes = '${d.mes}' && dia = ${d.dia}`)
      } catch (_) {
        const record = new Record(col)
        Object.keys(d).forEach((k) => record.set(k, d[k]))
        app.save(record)
      }
    }
  },
  (app) => {
    // Safe to omit down for seeds if collection drops
  },
)
