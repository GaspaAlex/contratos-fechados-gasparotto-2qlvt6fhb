migrate(
  (app) => {
    // 1. Adicionar campo 'observacoes' na coleção 'contratos_fechados'
    const contratosCol = app.findCollectionByNameOrId('contratos_fechados')
    if (!contratosCol.fields.getByName('observacoes')) {
      contratosCol.fields.add(new TextField({ name: 'observacoes' }))
      app.save(contratosCol)
    }

    // 2. Cadastrar status 'Aguardando' na coleção 'status_contrato' de forma idempotente
    try {
      app.findFirstRecordByData('status_contrato', 'nome', 'Aguardando')
      // Já existe, não faz nada
    } catch (_) {
      const statusCol = app.findCollectionByNameOrId('status_contrato')
      const record = new Record(statusCol)
      record.set('nome', 'Aguardando')
      record.set('is_default', false)
      app.save(record)
    }
  },
  (app) => {
    // Reverter campo 'observacoes'
    try {
      const contratosCol = app.findCollectionByNameOrId('contratos_fechados')
      const observacoesField = contratosCol.fields.getByName('observacoes')
      if (observacoesField) {
        contratosCol.fields.remove(observacoesField)
        app.save(contratosCol)
      }
    } catch (_) {}

    // Reverter status 'Aguardando'
    try {
      const record = app.findFirstRecordByData('status_contrato', 'nome', 'Aguardando')
      app.delete(record)
    } catch (_) {}
  },
)
