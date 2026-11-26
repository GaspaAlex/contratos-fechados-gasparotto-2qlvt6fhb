// pocketbase/migrations/0107_protocolo_decisao_extinto.js
//
// BUILD C — 4ª opção no campo DECISÃO (aditiva, sem backfill)
// ============================================================
// Amplia SOMENTE as opções permitidas do select `decisao` da coleção
// `protocolo`: "Aguardando", "Procedente", "Improcedente" + a nova
// "Extinto sem resolução do mérito" (denominação exata).
//
// - Nome, tipo, required e todos os demais atributos do campo preservados;
// - Os 3 valores anteriores permanecem exatamente como estão;
// - NENHUM registro é convertido ou regravado (sem backfill);
// - Coleção `protocolo` intacta fora desse campo.
//
// ⚠ RUNTIME JSVM: tudo encapsulado dentro das funções de migração.
migrate(
  (app) => {
    var collection = app.findCollectionByNameOrId('protocolo')
    var field = collection.fields.getByName('decisao')
    if (!field) {
      throw new Error('[PROTOCOLO_DECISAO_EXTINTO] campo decisao não encontrado em protocolo')
    }
    var values = field.values || []
    var NOVA = 'Extinto sem resolução do mérito'
    if (values.indexOf(NOVA) !== -1) {
      console.log('[PROTOCOLO_DECISAO_EXTINTO] opção já presente — nada a fazer')
      return
    }
    field.values = values.concat([NOVA])
    app.save(collection)
    console.log('[PROTOCOLO_DECISAO_EXTINTO] opções do select decisao ampliadas')
  },
  (app) => {
    // Down: remove apenas a opção nova (não afeta valores armazenados).
    var collection = app.findCollectionByNameOrId('protocolo')
    var field = collection.fields.getByName('decisao')
    if (!field) return
    var NOVA = 'Extinto sem resolução do mérito'
    var values = (field.values || []).filter(function (v) {
      return v !== NOVA
    })
    if (values.length === (field.values || []).length) return
    field.values = values
    app.save(collection)
  },
)
