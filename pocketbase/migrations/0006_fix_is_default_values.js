migrate(
  (app) => {
    // 1. Ensure 'is_default' field exists in 'tipos_acao'
    const tiposCol = app.findCollectionByNameOrId('tipos_acao')
    if (!tiposCol.fields.getByName('is_default')) {
      tiposCol.fields.add(new BoolField({ name: 'is_default' }))
      app.save(tiposCol)
    }

    // 2. Ensure 'is_default' field exists in 'status_contrato'
    const statusCol = app.findCollectionByNameOrId('status_contrato')
    if (!statusCol.fields.getByName('is_default')) {
      statusCol.fields.add(new BoolField({ name: 'is_default' }))
      app.save(statusCol)
    }

    // 3. Update 'tipos_acao' records based on predefined names
    const defaultTipos = ['Aux. Acidente', 'Aposentadoria', 'BPC/LOAS', 'DER', 'Pensão por Morte']

    const tiposRecords = app.findRecordsByFilter('tipos_acao', "id != ''", '', 1000, 0)
    for (const record of tiposRecords) {
      const nome = record.getString('nome')
      const isDefault = defaultTipos.includes(nome)
      record.set('is_default', isDefault)
      app.save(record)
    }

    // 4. Update 'status_contrato' records based on predefined names
    const defaultStatus = [
      'R. Docs',
      'L. Cálculos',
      'OK',
      'Ag. Perícia',
      'Sem Qualidade de Segurado',
      'Tem Advogado',
      'Litispendência',
    ]

    const statusRecords = app.findRecordsByFilter('status_contrato', "id != ''", '', 1000, 0)
    for (const record of statusRecords) {
      const nome = record.getString('nome')
      const isDefault = defaultStatus.includes(nome)
      record.set('is_default', isDefault)
      app.save(record)
    }
  },
  (app) => {
    // Revert updates by setting 'is_default' to false for all records
    const tiposRecords = app.findRecordsByFilter('tipos_acao', "id != ''", '', 1000, 0)
    for (const record of tiposRecords) {
      record.set('is_default', false)
      app.save(record)
    }

    const statusRecords = app.findRecordsByFilter('status_contrato', "id != ''", '', 1000, 0)
    for (const record of statusRecords) {
      record.set('is_default', false)
      app.save(record)
    }
  },
)
