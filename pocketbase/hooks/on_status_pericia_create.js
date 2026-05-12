onRecordAfterCreateSuccess((e) => {
  const statusName = e.record.getString('nome')
  const col = $app.findCollectionByNameOrId('pericias')
  const statusField = col.fields.getByName('status')

  if (statusField) {
    let vals = statusField.values || []
    const newVals = []
    for (let i = 0; i < vals.length; i++) {
      newVals.push(vals[i])
    }

    if (!newVals.includes(statusName)) {
      newVals.push(statusName)
      statusField.values = newVals
      $app.saveNoValidate(col)
    }
  }
  e.next()
}, 'status_pericia')
