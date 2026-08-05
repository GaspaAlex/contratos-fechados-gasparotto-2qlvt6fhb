migrate(
  (app) => {
    const protocoloCol = app.findCollectionByNameOrId('protocolo')
    protocoloCol.addIndex('idx_protocolo_dprotocolo', false, 'dprotocolo', '')
    protocoloCol.addIndex('idx_protocolo_dcalculo', false, 'dcalculo', '')
    protocoloCol.addIndex('idx_protocolo_status', false, 'status', '')
    protocoloCol.addIndex('idx_protocolo_responsavel', false, 'responsavel', '')
    app.save(protocoloCol)

    const contratosCol = app.findCollectionByNameOrId('contratos_fechados')
    contratosCol.addIndex('idx_contratos_status', false, 'status', '')
    contratosCol.addIndex('idx_contratos_origem', false, 'origem', '')
    contratosCol.addIndex('idx_contratos_campanha_origem', false, 'campanha_origem', '')
    app.save(contratosCol)

    const leadsCol = app.findCollectionByNameOrId('leads_registro')
    leadsCol.addIndex('idx_leads_registro_data', false, 'data', '')
    leadsCol.addIndex('idx_leads_registro_campanha', false, 'campanha', '')
    app.save(leadsCol)
  },
  (app) => {
    const protocoloCol = app.findCollectionByNameOrId('protocolo')
    protocoloCol.removeIndex('idx_protocolo_dprotocolo')
    protocoloCol.removeIndex('idx_protocolo_dcalculo')
    protocoloCol.removeIndex('idx_protocolo_status')
    protocoloCol.removeIndex('idx_protocolo_responsavel')
    app.save(protocoloCol)

    const contratosCol = app.findCollectionByNameOrId('contratos_fechados')
    contratosCol.removeIndex('idx_contratos_status')
    contratosCol.removeIndex('idx_contratos_origem')
    contratosCol.removeIndex('idx_contratos_campanha_origem')
    app.save(contratosCol)

    const leadsCol = app.findCollectionByNameOrId('leads_registro')
    leadsCol.removeIndex('idx_leads_registro_data')
    leadsCol.removeIndex('idx_leads_registro_campanha')
    app.save(leadsCol)
  },
)
