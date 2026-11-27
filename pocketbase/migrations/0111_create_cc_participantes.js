// BUILD C1-A — PARTICIPANTES DO MÓDULO CONTRACHEQUES
// ============================================================
// UMA collection NOVA, aditiva — NADA existente é alterado:
//   cc_participantes — vínculo do funcionário do Cartão de Ponto com o módulo
//   Contracheques (relation→funcionarios). A listagem da aba passa a mostrar
//   SOMENTE quem tem vínculo ativo.
//
// SELEÇÃO (decisão do usuário): NÃO é lista fixa de nomes no código — é uma
// coleção privada controlada pela própria aba ("Gerenciar participantes").
// Os funcionários do Cartão de Ponto permanecem INTACTOS (nenhum registro da
// collection funcionarios é criado, alterado ou excluído aqui).
//
// ACESSO EXCLUSIVO: as cinco regras de API espelham exatamente as da
// cc_salarios (migration 0110) — usuário autorizado por ID interno estável
// (yxubawrt8aser8k) ou pelo e-mail de fallback (escritorio@advocaciagasparotto
// .com.br). Nenhuma regra pública; outros gestores ficam de fora (403/404).
//
// IDEMPOTÊNCIA DO SEED: localiza cada vínculo por (funcionario, ativo),
// cria somente o que não existe e reativa o inativo dos 4 autorizados.
// Reexecutar a migration NÃO duplica vínculos.
//
// RETIRADA DE PARTICIPANTE: desativação do vínculo (ativo=false) — o
// histórico salarial eventual em cc_salarios é PRESERVADO (nada aqui toca em
// cc_salarios; não há delete em cascata — cascadeDelete: false).
//
// ⚠ NÃO criar neste build: salários, contracheques mensais, DSR, INSS, IRRF,
// férias, 13º ou qualquer dado financeiro nos participantes.

migrate(
  (app) => {
    const funcionariosId = app.findCollectionByNameOrId('funcionarios').id

    // ------------------------------------------------------------------
    // 1. Collection cc_participantes
    // ------------------------------------------------------------------
    let participantes
    try {
      participantes = app.findCollectionByNameOrId('cc_participantes')
    } catch {
      participantes = new Collection({
        type: 'base',
        name: 'cc_participantes',
        fields: [
          {
            type: 'relation',
            name: 'funcionario',
            required: true,
            collectionId: funcionariosId,
            maxSelect: 1,
            cascadeDelete: false,
          },
          // Sem required: bool required rejeitaria ativo=false (vazio ≠ false).
          { type: 'bool', name: 'ativo' },
          { type: 'text', name: 'observacao', max: 200 },
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
          { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_cc_participantes_funcionario ON cc_participantes (funcionario)',
          'CREATE INDEX idx_cc_participantes_ativo ON cc_participantes (ativo)',
        ],
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
      })
      app.save(participantes)
    }

    // ------------------------------------------------------------------
    // 2. Seed IDEMPOTENTE dos 4 participantes autorizados
    //    (IDs lidos do banco real — collection funcionarios — não inventados;
    //    o 2º registro de Nataly, duplicado sem vínculo de usuário, fica
    //    FORA da seleção inicial e pode ser gerenciado pela interface).
    // ------------------------------------------------------------------
    const AUTORIZADOS = [
      { id: 'g58j7rgfn66kw18', nome: 'Nataly Tayna Figueiredo da Silva' },
      { id: '61n9us4w9eu8j11', nome: 'Nayara Vitória de Morais' },
      { id: 'ds27l78xotgofm1', nome: 'Kaique Gotardo de Carvalho dos Santos' },
      { id: '8fg62tcjfnds7kv', nome: 'Beatriz Yumi Aizawa Yamashita' },
    ]

    for (const p of AUTORIZADOS) {
      const existentes = app.findRecordsByFilter(
        'cc_participantes',
        "funcionario = '" + p.id + "'",
        '',
        1,
        0,
      )
      if (existentes.length > 0) {
        // Já existe vínculo — só garante que está ativo (idempotência).
        const vinculo = existentes[0]
        if (!vinculo.getBool('ativo')) {
          vinculo.set('ativo', true)
          app.save(vinculo)
          console.log('cc_participantes: reativado vínculo de ' + p.nome)
        }
        continue
      }
      const record = new Record(participantes)
      record.set('funcionario', p.id)
      record.set('ativo', true)
      record.set('observacao', '')
      app.save(record)
      console.log('cc_participantes: vínculo criado para ' + p.nome)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('cc_participantes'))
    } catch {
      // já inexistente — down idempotente
    }
  },
)
