// pocketbase/migrations/0106_protocolo_tipo_continuidade.js
//
// NOVO PROTOCOLO DO MESMO CASO — classificação da continuidade (aditiva)
// ======================================================================
// Campo novo em `protocolo` (idempotente, nenhum campo existente alterado):
//   - `tipo_continuidade` (select, maxSelect 1, OPCIONAL no schema — a
//     obrigatoriedade é aplicada no hook protocolo_novo_mesmo_caso.js APENAS
//     dentro do fluxo de continuação; cadastro/edição convencionais não são
//     afetados).
// Sem backfill: registros existentes permanecem com o campo vazio.
//
// ⚠ RUNTIME JSVM: tudo encapsulado dentro das funções de migração.
migrate(
  (app) => {
    var collection = app.findCollectionByNameOrId('protocolo')
    if (collection.fields.getByName('tipo_continuidade')) {
      console.log('[PROTOCOLO_TIPO_CONTINUIDADE] campo já existe — nada a fazer')
      return
    }
    collection.fields.add(
      new Field({
        name: 'tipo_continuidade',
        type: 'select',
        required: false,
        hidden: false,
        presentable: false,
        maxSelect: 1,
        values: ['Administrativo → Judicial', 'Novo ajuizamento', 'Outra continuidade justificada'],
      }),
    )
    app.save(collection)
    console.log('[PROTOCOLO_TIPO_CONTINUIDADE] campo tipo_continuidade criado')
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('protocolo')
    if (collection.fields.getByName('tipo_continuidade')) {
      collection.fields.removeByName('tipo_continuidade')
      app.save(collection)
    }
  },
)
