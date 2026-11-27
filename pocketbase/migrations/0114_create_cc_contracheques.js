// BUILD C2 — CONTRACHEQUE MENSAL (coleções de demonstrativos)
// ============================================================
// DUAS collections NOVAS e ADITIVAS — nenhuma collection existente é alterada:
//
//   cc_contracheques — o demonstrativo mensal de UM colaborador para UMA
//     competência (mês + ano). Grava o SALÁRIO-BASE UTILIZADO (snapshot) para
//     que o demonstrativo nunca mude silenciosamente se o cadastro salarial
//     for alterado depois. `status` já nasce com os estados futuros de
//     fechamento/pagamento previstos ('rascunho' | 'fechado' | 'pago') —
//     NENHUMA operação de fechamento/pagamento é implementada neste build
//     (todos os demonstrativos ficam em 'rascunho').
//   cc_lancamentos — lançamentos manuais (vencimentos e descontos) vinculados
//     ao demonstrativo (relation → cc_contracheques, cascadeDelete: excluir o
//     demonstrativo apaga os lançamentos dele, evitando órfãos).
//
// SEGURANÇA (idêntica a cc_salarios/cc_participantes/cc_colaboradores,
// Builds C1/C1-A/C1-B): TODAS as cinco regras de API exigem o usuário
// autorizado por ID interno estável (yxubawrt8aser8k, coleção users) com
// fallback pelo e-mail (escritorio@advocaciagasparotto.com.br). Nenhuma regra
// pública ou vazia; outros gestores e colaboradores levam 403/404 na API
// direta. Nenhuma OUTRA collection tem permissões alteradas.
//
// ANTI-DUPLICIDADE: índice único (funcionario_id, competencia) — no máximo um
// demonstrativo do tipo 'folha' por colaborador por competência. Salvar
// repetidamente reabre o MESMO demonstrativo (o serviço consulta antes).
// funcionario_id é TEXT (não relation): a identidade pode vir de funcionarios
// (Cartão de Ponto) OU de cc_colaboradores (cadastro próprio do módulo) —
// o registro da pessoa NÃO é modificado por este build de nenhuma forma.
//
// PRECISÃO MONETÁRIA: valores em NumberField float64 (mesma escolha do C1),
// com toda a matemática do app feita em CENTAVOS inteiros (função pura
// src/lib/ccContracheque.ts) e formatação pt-BR a 2 casas.
//
// ⚠ NÃO criado neste build: cálculo de encargos, pagamentos, anexos, PDF.

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
    // 1. cc_contracheques — demonstrativo mensal (idempotente)
    // ------------------------------------------------------------------
    let contracheques
    try {
      contracheques = app.findCollectionByNameOrId('cc_contracheques')
    } catch {
      contracheques = null
    }
    if (!contracheques) {
      contracheques = new Collection({
        type: 'base',
        name: 'cc_contracheques',
        fields: [
          // Identidade do colaborador (id de funcionarios OU cc_colaboradores)
          { type: 'text', name: 'funcionario_id', required: true, min: 1, max: 30 },
          // Nome gravado no demonstrativo (histórico — exibição preservada)
          { type: 'text', name: 'funcionario_nome', required: true, min: 1, max: 150 },
          // Competência: mês (1..12) + ano (4 dígitos)
          {
            type: 'number',
            name: 'competencia_mes',
            required: true,
            onlyInt: true,
            min: 1,
            max: 12,
          },
          {
            type: 'number',
            name: 'competencia_ano',
            required: true,
            onlyInt: true,
            min: 2000,
            max: 2100,
          },
          // Tipo do demonstrativo — neste build só 'folha'
          { type: 'select', name: 'tipo', values: ['folha'], required: true, maxSelect: 1 },
          // Estados futuros já previstos; operações de fechamento/pagamento
          // NÃO são implementadas neste build (o app só grava 'rascunho')
          {
            type: 'select',
            name: 'status',
            values: ['rascunho', 'fechado', 'pago'],
            required: true,
            maxSelect: 1,
          },
          // SALÁRIO-BASE snapshot gravado no demonstrativo (nunca muda depois)
          { type: 'number', name: 'salario_base', min: 0, onlyInt: false },
          // true quando NÃO havia vigência salarial para a competência
          // (demonstrativo salvo incompleto/parcial)
          { type: 'bool', name: 'salario_nao_cadastrado' },
          { type: 'text', name: 'observacoes', max: 2000 },
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
          { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_cc_contracheques_folha ON cc_contracheques (funcionario_id, competencia_mes, competencia_ano, tipo)',
          'CREATE INDEX idx_cc_contracheques_funcionario ON cc_contracheques (funcionario_id)',
          'CREATE INDEX idx_cc_contracheques_competencia ON cc_contracheques (competencia_ano, competencia_mes)',
        ],
        ...REGRAS,
      })
      app.save(contracheques)
    }

    // ------------------------------------------------------------------
    // 2. cc_lancamentos — vencimentos/descontos manuais do demonstrativo
    // ------------------------------------------------------------------
    let lancamentos
    try {
      lancamentos = app.findCollectionByNameOrId('cc_lancamentos')
    } catch {
      const contrachequesId = contracheques.id
      lancamentos = new Collection({
        type: 'base',
        name: 'cc_lancamentos',
        fields: [
          {
            type: 'relation',
            name: 'contracheque',
            required: true,
            collectionId: contrachequesId,
            maxSelect: 1,
            cascadeDelete: true,
          },
          // 'vencimento' (gratificação, comissão informada, diferença salarial,
          // outros) ou 'desconto' (adiantamento, desconto autorizado, parcela
          // de empréstimo, outros). Sem INSS/IRRF neste build.
          {
            type: 'select',
            name: 'natureza_tipo',
            values: ['vencimento', 'desconto'],
            required: true,
            maxSelect: 1,
          },
          // Natureza declarada pelo usuário (texto livre com exemplos
          // sugeridos na UI) — não é cálculo automático
          { type: 'text', name: 'descricao', required: true, min: 1, max: 120 },
          { type: 'number', name: 'valor', required: false, min: 0, onlyInt: false },
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
          { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_cc_lancamentos_contracheque ON cc_lancamentos (contracheque)'],
        ...REGRAS,
      })
      app.save(lancamentos)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('cc_lancamentos'))
    } catch {
      // já inexistente — down idempotente
    }
    try {
      app.delete(app.findCollectionByNameOrId('cc_contracheques'))
    } catch {
      // já inexistente — down idempotente
    }
  },
)
