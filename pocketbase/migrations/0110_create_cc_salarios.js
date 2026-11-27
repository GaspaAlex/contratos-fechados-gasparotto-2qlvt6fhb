// BUILD C1 — FUNDAÇÃO SEGURA DA ABA CONTRACHEQUES
// ============================================================
// UMA collection NOVA, aditiva, sem tocar em nada existente:
//   cc_salarios — vigências salariais por funcionário (relation→funcionarios).
//
// ACESSO EXCLUSIVO ao usuário do e-mail escritorio@advocaciagasparotto.com.br
// (ID interno estável: yxubawrt8aser8k, coleção users — conf. live 26/11/2026):
//   - Todas as cinco regras usam o ID do usuário (condição primária) e, em
//     cascata, o e-mail — se o e-mail mudar na coleção users, o ID manda.
//   - NENHUMA regra pública ou vazia. Outros gestores (Nataly, Dr. Caio) e
//     colaboradores comuns ficam de fora (403/404 na API).
//   - Superusuários PocketBase (coleção _superusers) continuam tecnicamente
//     acima das regras de API — limitação documentada no relatório do build.
//
// PRECISÃO MONETÁRIA (documentação da escolha):
//   - valor (salário): NumberField com onlyInt=false e min=0 — PocketBase
//     armazena number como float64 (double IEEE-754), a mesma precisão de um
//     número decimal de banco financeiro para valores salariais com 2 casas;
//     NÃO é um float simples de precisão única. Toda EXIBIÇÃO/cálculo de
//     salário no frontend formata com toLocaleString('pt-BR') para 2 casas.
//   - vigencia_inicio / vigencia_fim: DateField (data civil, sem hora) —
//     vigências são inclusivas: [inicio, fim]; fim vazio = em vigor.
//
// HISTÓRICO: alterar o salário a partir de uma data futura = encerrar a
// vigência anterior (vigencia_fim) + criar nova vigência. Nunca se altera
// salário histórico (proteção server-side no hook cc_salarios_vigencias).
//
// ÍNDICE ÚNICO funcionario + vigencia_inicio: no máximo uma vigência por início.
//
// ⚠ NÃO criar neste build: cc_contracheques, cc_lancamentos, cc_comissoes_lanc,
//   cc_emprestimos, cc_tabelas_legais, cc_feriados, cc_pagamentos.

migrate(
  (app) => {
    const funcionariosId = app.findCollectionByNameOrId('funcionarios').id

    const salarios = new Collection({
      type: 'base',
      name: 'cc_salarios',
      fields: [
        {
          type: 'relation',
          name: 'funcionario',
          required: true,
          collectionId: funcionariosId,
          maxSelect: 1,
        },
        {
          type: 'number',
          name: 'valor',
          required: false,
          min: 0,
          onlyInt: false,
        },
        {
          type: 'date',
          name: 'vigencia_inicio',
          required: true,
        },
        {
          type: 'date',
          name: 'vigencia_fim',
        },
        { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
        { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_cc_salarios_funcionario_inicio ON cc_salarios (funcionario, vigencia_inicio)',
        'CREATE INDEX idx_cc_salarios_funcionario ON cc_salarios (funcionario)',
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
    app.save(salarios)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('cc_salarios'))
    } catch {
      // já inexistente — down idempotente
    }
  },
)
