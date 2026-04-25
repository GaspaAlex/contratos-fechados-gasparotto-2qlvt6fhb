migrate(
  (app) => {
    const funcionarios = app.findCollectionByNameOrId('funcionarios')
    const collection = new Collection({
      name: 'registros',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        {
          name: 'funcionario_id',
          type: 'relation',
          collectionId: funcionarios.id,
          required: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        { name: 'dia_semana', type: 'text' },
        { name: 'entrada1', type: 'text' },
        { name: 'saida1', type: 'text' },
        { name: 'entrada2', type: 'text' },
        { name: 'saida2', type: 'text' },
        { name: 'horas_trabalhadas', type: 'number', onlyInt: true },
        { name: 'saldo_dia', type: 'number', onlyInt: true },
        {
          name: 'tipo_dia',
          type: 'select',
          values: ['normal', 'feriado', 'falta', 'atestado', 'fim_de_semana'],
          maxSelect: 1,
        },
        { name: 'justificativa', type: 'text' },
        { name: 'horas_atestado', type: 'number', onlyInt: true },
        { name: 'editado_por', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('registros')
    app.delete(collection)
  },
)
