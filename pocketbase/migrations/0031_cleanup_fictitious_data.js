migrate(
  (app) => {
    // 1. Delete associated records in 'registros' that do not belong to the target employees
    app
      .db()
      .newQuery(`
    DELETE FROM registros 
    WHERE funcionario_id NOT IN (
      SELECT id FROM funcionarios 
      WHERE nome IN (
        'Giulianna dos Santos Assolini', 
        'Nataly Tayna Figueiredo da Silva', 
        'Dr. Alex José Coelho Gasparotto'
      )
    )
  `)
      .execute()

    // 2. Delete associated records in 'saldos_mensais' that do not belong to the target employees
    app
      .db()
      .newQuery(`
    DELETE FROM saldos_mensais 
    WHERE funcionario_id NOT IN (
      SELECT id FROM funcionarios 
      WHERE nome IN (
        'Giulianna dos Santos Assolini', 
        'Nataly Tayna Figueiredo da Silva', 
        'Dr. Alex José Coelho Gasparotto'
      )
    )
  `)
      .execute()

    // 3. Delete the actual 'funcionarios' records that are not the target employees
    app
      .db()
      .newQuery(`
    DELETE FROM funcionarios 
    WHERE nome NOT IN (
      'Giulianna dos Santos Assolini', 
      'Nataly Tayna Figueiredo da Silva', 
      'Dr. Alex José Coelho Gasparotto'
    )
  `)
      .execute()
  },
  (app) => {
    // Data deletion is irreversible.
  },
)
