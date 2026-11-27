// BUILD C3 — COMISSÕES MANUAIS E DSR AUTOMÁTICO
// ============================================================
// ADITIVO — nenhuma collection existente é recriada, nenhum registro é
// alterado além do backfill do novo campo `origem` (valor 'manual' para os
// lançamentos que já existem — preserva exatamente o comportamento atual):
//
//   1. cc_feriados (NOVA) — calendário privado do módulo Contracheques para
//      feriados ESTADUAIS, MUNICIPAIS e datas avulsas. Os feriados NACIONAIS
//      são embutidos no motor puro (src/lib/ccComissaoDsr.ts) e NÃO são
//      gravados aqui. `ano = 0` = feriado recorrente (todo ano).
//   2. cc_contracheques — campos aditivos do snapshot de Comissão + DSR:
//      modalidade, quantidade de casos, valor unitário, valor direto,
//      comissão total, dias úteis/repouso usados, ajuste + motivo,
//      calendário de referência e DSR total. Guardar o snapshot JUNTO ao
//      demonstrativo garante que reabrir preserte exatamente o que foi salvo
//      (alteração futura do calendário não muda valor já gravado).
//   3. cc_lancamentos — campo `origem` ('manual' | 'comissao' |
//      'dsr_comissao'): permite identificar as rubricas calculadas e impedir
//      duplicidade ao salvar/reabrir (atualiza em vez de criar de novo).
//
// SEGURANÇA: TODAS as cinco regras de API de cc_feriados exigem o usuário
// autorizado por ID interno estável (yxubawrt8aser8k) com fallback pelo
// e-mail (escritorio@advocaciagasparotto.com.br) — idêntico às demais cc_*.
// Nenhuma regra pública; nenhuma OUTRA collection tem permissões alteradas.
//
// PRECISÃO: campos de valor em NumberField float64 (mesma escolha dos builds
// C1/C2); a matemática do app é feita em CENTAVOS inteiros na lib pura.
//
// ⚠ NÃO criado neste build: INSS, IRRF, 13º, férias, fechamento/pagamento.

migrate(
  (app) => {
    const REGRAS = {
      listRule:
        "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
      createRule:
        "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
    }

    // ------------------------------------------------------------------
    // 1. cc_feriados — feriados estaduais/municipais/avulsos (idempotente)
    // ------------------------------------------------------------------
    let feriados
    try {
      feriados = app.findCollectionByNameOrId('cc_feriados')
    } catch {
      feriados = null
    }
    if (!feriados) {
      feriados = new Collection({
        type: 'base',
        name: 'cc_feriados',
        fields: [
          { type: 'text', name: 'nome', required: true, min: 2, max: 120 },
          { type: 'number', name: 'dia', required: true, onlyInt: true, min: 1, max: 31 },
          { type: 'number', name: 'mes', required: true, onlyInt: true, min: 1, max: 12 },
          // 0 = recorrente (cai todo ano, ex. aniversário da cidade)
          { type: 'number', name: 'ano', onlyInt: true, min: 0, max: 2100 },
          // 'estadual' | 'municipal' | 'avulso' (texto — validação na UI)
          { type: 'text', name: 'escopo', max: 20 },
          { type: 'text', name: 'uf', max: 2 },
          { type: 'text', name: 'municipio', max: 80 },
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
          { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_cc_feriados_unico ON cc_feriados (nome COLLATE NOCASE, dia, mes, ano)',
          'CREATE INDEX idx_cc_feriados_data ON cc_feriados (mes, dia)',
        ],
        ...REGRAS,
      })
      app.save(feriados)
    }

    // ------------------------------------------------------------------
    // 2. cc_contracheques — campos aditivos do snapshot de Comissão + DSR
    // ------------------------------------------------------------------
    const contracheques = app.findCollectionByNameOrId('cc_contracheques')
    const addTexto = (col, nome, max) => {
      if (!col.fields.getByName(nome)) col.fields.add(new Field({ type: 'text', name: nome, max }))
    }
    const addNumero = (col, nome) => {
      if (!col.fields.getByName(nome))
        col.fields.add(new Field({ type: 'number', name: nome, min: 0, onlyInt: false }))
    }
    const addNumeroInt = (col, nome) => {
      if (!col.fields.getByName(nome))
        col.fields.add(new Field({ type: 'number', name: nome, min: 0, onlyInt: true }))
    }
    const addBool = (col, nome) => {
      if (!col.fields.getByName(nome)) col.fields.add(new Field({ type: 'bool', name: nome }))
    }
    addTexto(contracheques, 'comissao_modalidade', 20) // '' | 'casos' | 'valor_direto'
    addNumeroInt(contracheques, 'comissao_qtd_casos')
    addNumero(contracheques, 'comissao_valor_caso')
    addNumero(contracheques, 'comissao_valor_direto')
    addNumero(contracheques, 'comissao_total')
    addBool(contracheques, 'comissao_ativa')
    addNumeroInt(contracheques, 'dsr_dias_uteis')
    addNumeroInt(contracheques, 'dsr_dias_repouso')
    addBool(contracheques, 'dsr_ajustado')
    addTexto(contracheques, 'dsr_motivo_ajuste', 500)
    addNumeroInt(contracheques, 'dsr_calendario_dias_uteis')
    addNumeroInt(contracheques, 'dsr_calendario_dias_repouso')
    addNumero(contracheques, 'dsr_total')
    app.save(contracheques)

    // ------------------------------------------------------------------
    // 3. cc_lancamentos — campo `origem` + backfill 'manual'
    // ------------------------------------------------------------------
    const lanc = app.findCollectionByNameOrId('cc_lancamentos')
    if (!lanc.fields.getByName('origem')) {
      lanc.fields.add(new Field({ type: 'text', name: 'origem', max: 30 }))
      app.save(lanc)
    }
    const semOrigem = app.findRecordsByFilter('cc_lancamentos', "origem = ''", '', 0, 0)
    for (const rec of semOrigem) {
      rec.set('origem', 'manual')
      app.save(rec)
    }
  },
  (app) => {
    // down — best-effort e idempotente; nunca apaga dados de outras builds
    try {
      const lanc = app.findCollectionByNameOrId('cc_lancamentos')
      if (lanc.fields.getByName('origem')) {
        lanc.fields.removeByName('origem')
        app.save(lanc)
      }
    } catch {
      // nada a fazer
    }
    try {
      const col = app.findCollectionByNameOrId('cc_contracheques')
      const nomes = [
        'comissao_modalidade',
        'comissao_qtd_casos',
        'comissao_valor_caso',
        'comissao_valor_direto',
        'comissao_total',
        'comissao_ativa',
        'dsr_dias_uteis',
        'dsr_dias_repouso',
        'dsr_ajustado',
        'dsr_motivo_ajuste',
        'dsr_calendario_dias_uteis',
        'dsr_calendario_dias_repouso',
        'dsr_total',
      ]
      let mudou = false
      for (const n of nomes) {
        if (col.fields.getByName(n)) {
          col.fields.removeByName(n)
          mudou = true
        }
      }
      if (mudou) app.save(col)
    } catch {
      // nada a fazer
    }
    try {
      app.delete(app.findCollectionByNameOrId('cc_feriados'))
    } catch {
      // já inexistente — down idempotente
    }
  },
)
