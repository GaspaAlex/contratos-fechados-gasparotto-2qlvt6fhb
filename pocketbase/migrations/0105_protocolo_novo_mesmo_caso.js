// pocketbase/migrations/0105_protocolo_novo_mesmo_caso.js
//
// NOVO PROTOCOLO DO MESMO CASO (reabertura/reajuizamento)
// ========================================================
// 1) Campos novos em `protocolo` (idempotente, nenhum campo existente alterado):
//    - `caso_origem` (relation → protocolo, maxSelect 1, opcional): raiz da
//      cadeia do caso — presente APENAS em protocolos de continuação criados
//      pelo fluxo "Novo protocolo do mesmo caso".
//    - `justificativa_reabertura` (text, opcional): justificativa OBRIGATÓRIA
//      no fluxo (exigida no backend), registrada permanentemente.
//    - `protocolo_anterior` (relation → protocolo, maxSelect 1, opcional):
//      auditoria — o registro imediatamente anterior da cadeia.
//    - `caso_continuacoes` (relation → protocolo, múltiplo, oculto): auditoria
//      da RAIZ da cadeia, preenchida pelo hook protocolo_novo_mesmo_caso.js no
//      momento da criação (não é editável pelo usuário).
// 2) Nenhum backfill: todos os registros existentes permanecem com os campos
//    vazios (registros reais não são modificados).
//
// ⚠ RUNTIME JSVM: tudo encapsulado dentro das funções de migração.
migrate(
  (app) => {
    var collection = app.findCollectionByNameOrId('protocolo')
    var protocoloCollectionId = collection.id

    var nomes = [
      'caso_origem',
      'justificativa_reabertura',
      'protocolo_anterior',
      'caso_continuacoes',
    ]
    var faltando = []
    for (var i = 0; i < nomes.length; i++) {
      if (!collection.fields.getByName(nomes[i])) faltando.push(nomes[i])
    }
    if (faltando.length === 0) {
      console.log('[PROTOCOLO_MESMO_CASO] campos já existem — nada a fazer')
      return
    }

    for (var f = 0; f < faltando.length; f++) {
      var nome = faltando[f]
      if (nome === 'justificativa_reabertura') {
        collection.fields.add(
          new Field({
            name: nome,
            type: 'text',
            required: false,
            hidden: false,
            presentable: false,
            max: 2000,
          }),
        )
      } else {
        collection.fields.add(
          new Field({
            name: nome,
            type: 'relation',
            required: false,
            hidden: nome === 'caso_continuacoes',
            presentable: false,
            collectionId: protocoloCollectionId,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: nome === 'caso_continuacoes' ? 99 : 1,
          }),
        )
      }
    }
    app.save(collection)
    console.log('[PROTOCOLO_MESMO_CASO] campos criados: ' + faltando.join(', '))
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('protocolo')
    var nomes = [
      'caso_origem',
      'justificativa_reabertura',
      'protocolo_anterior',
      'caso_continuacoes',
    ]
    for (var i = 0; i < nomes.length; i++) {
      if (collection.fields.getByName(nomes[i])) {
        collection.fields.removeByName(nomes[i])
      }
    }
    app.save(collection)
  },
)
