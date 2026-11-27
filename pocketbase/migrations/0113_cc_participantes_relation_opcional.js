// BUILD C1-B — CORREÇÃO DA ESTRUTURA DE cc_participantes (pós-0112)
// ============================================================
// A migration 0111 (C1-A) deixou a relation `funcionario` como REQUIRED e um
// índice único em (funcionario) — com a relação opcional para cc_colaboradores
// (C1-B), ambos precisam ser relaxados:
//
//   1. `funcionario` deixa de ser required (um vínculo pode apontar só para
//      cc_colaboradores — cadastro próprio do módulo, sem Cartão de Ponto).
//      A regra "exatamente UM dos dois preenchido" é garantida pela aplicação
//      (serviço + dialog, testados em CONTRACHEQUES_P) e pelo hook
//      cc_participantes_validacao, que recusa gravação com ambos vazio ou
//      ambos preenchidos.
//
//   2. Índice único por funcionário é recriado como PARTIAL INDEX: só vale
//      quando funcionario IS NOT NULL AND funcionario != '' — assim N vínculos
//      de colaborador próprio coexistem sem colisão de vazio, e cada
//      funcionário segue com no máximo 1 vínculo (proteção de duplicidade
//      em nível de banco, inclusive o caso do registro antigo da Nataly).
//
// IDEMPOTENTE: só age se o estado antigo ainda estiver em vigor; reexecutar
// é no-op. NENHUM registro é alterado e NENHUMA outra collection é tocada.
//
// (O down remove o partial index e devolve required ao campo — reversível.)

migrate(
  (app) => {
    const participantes = app.findCollectionByNameOrId('cc_participantes')

    // 1. funcionario deixa de ser required (se ainda for).
    const campoFunc = participantes.fields.getByName('funcionario')
    if (campoFunc.required) {
      campoFunc.required = false
      app.save(participantes)
      console.log('cc_participantes: campo funcionario agora é opcional')
    }

    // 2. Índice único parcial por funcionário (substitui o antigo).
    const IDX_ANTIGO = 'idx_cc_participantes_funcionario'
    const IDX_NOVO = 'idx_cc_participantes_funcionario_preenchido'
    const temNovo = participantes.indexes.some((i) => i.includes(IDX_NOVO))
    if (!temNovo) {
      // Recria os índices da collection substituindo o antigo pelo parcial.
      const semAntigo = participantes.indexes.filter((i) => !i.includes(IDX_ANTIGO))
      participantes.indexes = semAntigo.concat([
        'CREATE UNIQUE INDEX idx_cc_participantes_funcionario_preenchido ON cc_participantes (funcionario) WHERE funcionario IS NOT NULL AND funcionario != ""',
      ])
      app.save(participantes)
      console.log('cc_participantes: índice único de funcionario agora é parcial')
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('cc_participantes')
      const semNovo = col.indexes.filter(
        (i) => !i.includes('idx_cc_participantes_funcionario_preenchido'),
      )
      col.indexes = semNovo.concat([
        'CREATE UNIQUE INDEX idx_cc_participantes_funcionario ON cc_participantes (funcionario)',
      ])
      const campoFunc = col.fields.getByName('funcionario')
      campoFunc.required = true
      app.save(col)
    } catch {
      // collection inexistente — down idempotente
    }
  },
)
