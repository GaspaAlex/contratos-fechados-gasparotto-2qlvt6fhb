migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')

    const fields = [
      'qualif_c1',
      'qualif_c2',
      'qualif_c3',
      'qualif_c4',
      'qualif_c5',
      'sem_qualidade_c1',
      'sem_qualidade_c2',
      'sem_qualidade_c3',
      'sem_qualidade_c4',
      'sem_qualidade_c5',
      'aposentado_c1',
      'aposentado_c2',
      'aposentado_c3',
      'aposentado_c4',
      'aposentado_c5',
      'carne_c1',
      'carne_c2',
      'carne_c3',
      'carne_c4',
      'carne_c5',
      'outros_c1',
      'outros_c2',
      'outros_c3',
      'outros_c4',
      'outros_c5',
      'sem_interesse_c1',
      'sem_interesse_c2',
      'sem_interesse_c3',
      'sem_interesse_c4',
      'sem_interesse_c5',
      'engano_c1',
      'engano_c2',
      'engano_c3',
      'engano_c4',
      'engano_c5',
    ]

    for (const name of fields) {
      if (!col.fields.getByName(name)) {
        col.fields.add(new NumberField({ name: name }))
      }
    }

    app.save(col)

    // Set default to 0 for existing records
    const updates = fields.map((f) => `${f} = COALESCE(${f}, 0)`).join(', ')
    app.db().newQuery(`UPDATE leads_diarios SET ${updates}`).execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads_diarios')

    const fields = [
      'qualif_c1',
      'qualif_c2',
      'qualif_c3',
      'qualif_c4',
      'qualif_c5',
      'sem_qualidade_c1',
      'sem_qualidade_c2',
      'sem_qualidade_c3',
      'sem_qualidade_c4',
      'sem_qualidade_c5',
      'aposentado_c1',
      'aposentado_c2',
      'aposentado_c3',
      'aposentado_c4',
      'aposentado_c5',
      'carne_c1',
      'carne_c2',
      'carne_c3',
      'carne_c4',
      'carne_c5',
      'outros_c1',
      'outros_c2',
      'outros_c3',
      'outros_c4',
      'outros_c5',
      'sem_interesse_c1',
      'sem_interesse_c2',
      'sem_interesse_c3',
      'sem_interesse_c4',
      'sem_interesse_c5',
      'engano_c1',
      'engano_c2',
      'engano_c3',
      'engano_c4',
      'engano_c5',
    ]

    for (const name of fields) {
      col.fields.removeByName(name)
    }

    app.save(col)
  },
)
