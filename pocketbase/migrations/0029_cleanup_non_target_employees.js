migrate(
  (app) => {
    const name1 = 'Giulianna dos Santos Assolini'
    const name2 = 'Nataly Tayna Figueiredo da Silva'

    // 1. Delete child records: saldos_mensais
    app
      .db()
      .newQuery(`
    DELETE FROM saldos_mensais 
    WHERE funcionario_id NOT IN (
      SELECT id FROM funcionarios WHERE nome = {:name1} OR nome = {:name2}
    )
  `)
      .bind({ name1, name2 })
      .execute()

    // 2. Delete child records: registros
    app
      .db()
      .newQuery(`
    DELETE FROM registros 
    WHERE funcionario_id NOT IN (
      SELECT id FROM funcionarios WHERE nome = {:name1} OR nome = {:name2}
    )
  `)
      .bind({ name1, name2 })
      .execute()

    // 3. Delete parent records: funcionarios
    app
      .db()
      .newQuery(`
    DELETE FROM funcionarios 
    WHERE nome != {:name1} AND nome != {:name2}
  `)
      .bind({ name1, name2 })
      .execute()
  },
  (app) => {
    // Data deletion is irreversible. Empty down migration.
  },
)
