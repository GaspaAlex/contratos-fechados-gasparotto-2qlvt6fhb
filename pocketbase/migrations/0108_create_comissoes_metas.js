// pocketbase/migrations/0108_create_comissoes_metas.js
//
// BUILD E1 — ESTRUTURA DA META MENSAL DE COMISSÕES (migration ADITIVA)
// =====================================================================
// Cria a collection `comissoes_metas` com:
//   - mes  (number 1-12, onlyInt, required)
//   - ano  (number, onlyInt, required)
//   - meta (number >= 1, required) — quantidade de contratos fechados alvo
//   - índice ÚNICO mes+ano (idx_comissoes_metas_mes_ano)
//
// Regras de acesso (backend, não só interface):
//   - list/view: qualquer usuário autenticado (@request.auth.id != '')
//   - create/update/delete: somente perfil gestor
//     (@request.auth.perfil = "gestor")
//
// NENHUM registro é criado aqui (sem backfill, sem meta fictícia) e NENHUMA
// outra collection ou registro existente é alterado. O controle tem início em
// NOVEMBRO DE 2026: meses anteriores a 11/2026 simplesmente permanecem sem
// meta cadastrada ("Meta não definida") — a restrição é de processo, não de
// estrutura.
//
// ⚠ RUNTIME JSVM: tudo encapsulado dentro das funções de migração.
migrate(
  (app) => {
    // Idempotência defensiva: se já existe (replay), nada a fazer.
    try {
      app.findCollectionByNameOrId('comissoes_metas')
      console.log('[COMISSOES_METAS] collection já existe — nada a fazer')
      return
    } catch (_) {
      // não existe — cria abaixo
    }

    var collection = new Collection({
      name: 'comissoes_metas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      fields: [
        { name: 'mes', type: 'number', required: true, onlyInt: true, min: 1, max: 12 },
        { name: 'ano', type: 'number', required: true, onlyInt: true, min: 2026, max: 2100 },
        { name: 'meta', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_comissoes_metas_mes_ano ON comissoes_metas (mes, ano)'],
    })
    app.save(collection)
    console.log('[COMISSOES_METAS] collection criada (mes/ano/meta + índice único)')
  },
  (app) => {
    try {
      var collection = app.findCollectionByNameOrId('comissoes_metas')
      app.delete(collection)
      console.log('[COMISSOES_METAS] collection removida (down)')
    } catch (_) {
      // já não existe — down idempotente
    }
  },
)
