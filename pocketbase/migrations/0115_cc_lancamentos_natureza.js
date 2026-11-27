// BUILD C2 — CORRETIVA 0115: campo `natureza` em cc_lancamentos
// ============================================================
// A migration 0114 criou cc_lancamentos sem o campo `natureza` (a natureza
// declarada pelo usuário — ex.: "Gratificação", "Adiantamento salarial" —
// ficaria confundida com a descrição). Esta corretiva:
//   1. adiciona o campo text `natureza` (não obrigatório, max 120);
//   2. copia `descricao` → `natureza` nos registros existentes (a versão
//      anterior gravava a natureza na descricao);
//   3. deixa `descricao` como texto livre do usuário.
// Idempotente: se o campo já existe, não faz nada.
migrate(
  (app) => {
    let lanc
    try {
      lanc = app.findCollectionByNameOrId('cc_lancamentos')
    } catch {
      return // coleção ainda não existe (ordem de apply em ambiente novo)
    }

    let temNatureza = false
    for (const f of lanc.fields) {
      if (f.name === 'natureza') {
        temNatureza = true
        break
      }
    }
    if (temNatureza) return

    lanc.fields.add(new Field({ type: 'text', name: 'natureza', max: 120 }))
    app.save(lanc)

    // Backfill: natureza = descricao nos registros já gravados pela 0114.
    const registros = app.findRecordsByFilter('cc_lancamentos', "natureza = ''", '', 0, 0)
    for (const rec of registros) {
      rec.set('natureza', rec.getString('descricao'))
      app.save(rec)
    }
  },
  (app) => {
    // down: remove o campo natureza (best-effort)
    try {
      const lanc = app.findCollectionByNameOrId('cc_lancamentos')
      lanc.fields.removeByName('natureza')
      app.save(lanc)
    } catch {
      // nada a fazer
    }
  },
)
