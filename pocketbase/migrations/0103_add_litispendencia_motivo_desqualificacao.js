// pocketbase/migrations/0103_add_litispendencia_motivo_desqualificacao.js
//
// Regra de negócio do Item 17 (ajuste final) — desqualificação automática do
// lead quando um contrato de Auxílio-Acidente vinculado entra em um dos STATUS
// INVALIDANTES. Um dos motivos exigidos é "litispendencia", que NÃO existia na
// lista fechada do select `leads_aux_acidente.motivo_desqualificacao`.
//
// Migration MÍNIMA e IDEMPOTENTE: apenas acrescenta o valor à lista permitida
// (se ainda não existir). Nenhum outro valor é alterado, removido ou reordenado.
// Nenhum registro de lead é modificado aqui — a desqualificação em si é feita
// pelo hook server-side `leads_aux_acidente_vinculo.js`, sempre baseado na
// causa REAL atual dos contratos.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads_aux_acidente')
    const field = col.fields.getByName('motivo_desqualificacao')
    if (!field) {
      throw new Error('campo motivo_desqualificacao não encontrado em leads_aux_acidente')
    }
    const values = field.values || []
    if (values.indexOf('litispendencia') === -1) {
      field.values = values.concat(['litispendencia'])
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads_aux_acidente')
    const field = col.fields.getByName('motivo_desqualificacao')
    if (!field) return
    field.values = (field.values || []).filter((v) => v !== 'litispendencia')
    app.save(col)
  },
)
