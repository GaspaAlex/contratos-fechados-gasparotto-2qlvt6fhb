migrate(
  (app) => {
    // Idempotência: se a collection já existir (ex.: re-execução), apenas garante o estado esperado.
    try {
      app.findCollectionByNameOrId('leads_aux_acidente')
      return
    } catch (_) {
      // não existe ainda — segue a criação
    }

    const responsaveisId = app.findCollectionByNameOrId('responsaveis').id
    const contratosId = app.findCollectionByNameOrId('contratos_fechados').id

    const collection = new Collection({
      name: 'leads_aux_acidente',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'data_entrada', type: 'date', required: true },
        { name: 'telefone', type: 'text', required: true },
        {
          name: 'origem_lead',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['enlead', 'campanha'],
        },
        { name: 'nome', type: 'text', required: false },
        {
          name: 'responsavel',
          type: 'relation',
          required: false,
          collectionId: responsaveisId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'responsivo',
          type: 'select',
          required: false,
          maxSelect: 1,
          values: ['sim', 'nao'],
        },
        { name: 'respondido_em', type: 'date', required: false },
        {
          name: 'status_funil',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['qualificando', 'qualificado', 'desqualificado'],
        },
        {
          name: 'motivo_desqualificacao',
          type: 'select',
          required: false,
          maxSelect: 1,
          values: [
            'sem_qualidade',
            'aposentado',
            'contribuinte_carne',
            'sem_interesse',
            'recebe_auxilio_doenca',
            'nao_sofreu_acidente',
            'servidor_publico',
            'engano',
            'possui_advogado',
            'recebe_auxilio_acidente',
            'outros',
          ],
        },
        { name: 'motivo_desqualificacao_outro', type: 'text', required: false },
        { name: 'qualificado_em', type: 'date', required: false },
        { name: 'desqualificado_em', type: 'date', required: false },
        { name: 'observacoes', type: 'text', required: false },
        {
          name: 'contratos',
          type: 'relation',
          required: false,
          collectionId: contratosId,
          cascadeDelete: false,
          maxSelect: 99,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_leads_aux_acidente_data_entrada ON leads_aux_acidente (data_entrada)',
        'CREATE INDEX idx_leads_aux_acidente_telefone ON leads_aux_acidente (telefone)',
        'CREATE INDEX idx_leads_aux_acidente_origem_lead ON leads_aux_acidente (origem_lead)',
        'CREATE INDEX idx_leads_aux_acidente_status_funil ON leads_aux_acidente (status_funil)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('leads_aux_acidente')
    app.delete(collection)
  },
)
