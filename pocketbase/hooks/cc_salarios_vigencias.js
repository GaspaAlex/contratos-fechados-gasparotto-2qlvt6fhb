// BUILD C1 — PROTEÇÃO DE VIGÊNCIAS SALARIAIS (cc_salarios)
// ========================================================================
// Nenhum funcionário pode ter DUAS vigências salariais que se sobreponham.
// A validação roda NO BACKEND, na gravação (criação E atualização):
//   onRecordCreateExecute / onRecordUpdateExecute disparam DENTRO da
//   transação do save — lançar aqui reverte a operação inteira (atomicidade
//   garantida também contra escritas concorrentes).
//
// Períodos são INCLUSIVOS (o dia pertence a [inicio, fim]; fim vazio =
// em vigor até nova vigência):
//   [2026-01-01, vazio] e [2026-06-01, vazio]   → SOBREPÕEM;
//   [2026-01-01, 2026-05-31] e [2026-06-01, vazio] → coexistem;
//   vigencia_fim < vigencia_inicio              → incompatível (recusado).
//
// Histórico NUNCA é alterado automaticamente: uma vigência já iniciada pode
// apenas ter o ENCERRAMENTO (vigencia_fim) definido ou movido para frente —
// salário e início ficam imutáveis (padrão do hook comissoes_regras_
// sobreposicao, apontado para cc_salarios).
//
// ⚠ RUNTIME JSVM (goja): POOL SEPARADO — TODA a lógica vive DENTRO de cada
// callback (mesma convenção dos demais hooks do projeto).

onRecordCreateExecute(function (e) {
  e.next()

  function dataYMD(valor) {
    if (!valor) return ''
    return String(valor).slice(0, 10).replace(/T.*$/, '')
  }

  function hojeYMD() {
    var agora = new Date()
    var m = agora.getMonth() + 1
    var d = agora.getDate()
    return (
      agora.getFullYear() + '-' + (m < 10 ? '0' + m : '' + m) + '-' + (d < 10 ? '0' + d : '' + d)
    )
  }

  try {
    var record = e.record
    if (record.collection().name !== 'cc_salarios') return

    var inicio = dataYMD(record.getString('vigencia_inicio'))
    var fim = dataYMD(record.getString('vigencia_fim'))

    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(inicio)) {
      throw new BadRequestError('Vigência inicial inválida: informe uma data válida.')
    }
    if (fim !== '' && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fim)) {
      throw new BadRequestError('Vigência final inválida: informe uma data válida ou deixe vazia.')
    }
    if (fim !== '' && fim < inicio) {
      throw new BadRequestError(
        'Vigência incompatível: o fim (' +
          fim +
          ') não pode ser anterior ao início (' +
          inicio +
          ').',
      )
    }
    if (inicio > hojeYMD()) {
      throw new BadRequestError(
        'A vigência inicial não pode ser uma data futura (' +
          inicio +
          '). Salários retroativos são permitidos; futuros, não.',
      )
    }

    var funcionarioId = record.getString('funcionario')
    if (!funcionarioId) {
      throw new BadRequestError('Vigência salarial exige um funcionário vinculado.')
    }
    var nomeFuncionario = 'funcionário'
    try {
      var funcionario = e.app.findRecordById('funcionarios', funcionarioId)
      if (funcionario && funcionario.getString('nome')) {
        nomeFuncionario = funcionario.getString('nome')
      }
    } catch (errNome) {
      // relation inválida — a validação obrigatória do PocketBase recusará
    }

    // Sobreposição com QUALQUER outra vigência do mesmo funcionário (datas
    // inclusivas; vigência sem fim conta como aberta até 9999-12-31).
    var vigencias = e.app.findRecordsByFilter(
      'cc_salarios',
      "funcionario = '" + funcionarioId + "' && id != '" + record.id + "'",
      'vigencia_inicio',
      0,
      0,
    )
    var fimA = fim === '' ? '9999-12-31' : fim
    for (var i = 0; i < vigencias.length; i++) {
      var outraInicio = dataYMD(vigencias[i].getString('vigencia_inicio'))
      var outraFim = dataYMD(vigencias[i].getString('vigencia_fim'))
      var fimB = outraFim === '' ? '9999-12-31' : outraFim
      if (inicio <= fimB && outraInicio <= fimA) {
        throw new BadRequestError(
          'Conflito de vigência: ' +
            nomeFuncionario +
            ' já possui salário vigente nesse período (' +
            outraInicio +
            ' a ' +
            (outraFim === '' ? 'em vigor' : outraFim) +
            '). Para alterar o salário a partir de uma data, encerre a vigência anterior (vigência fim) e crie uma NOVA vigência.',
        )
      }
    }
  } catch (err) {
    if (err && err.name === 'BadRequestError') throw err
    throw new BadRequestError(
      'Validação de vigências salariais falhou (operação revertida): ' +
        (err && err.message ? err.message : err),
    )
  }
}, 'cc_salarios')

onRecordUpdateExecute(function (e) {
  e.next()

  function dataYMD(valor) {
    if (!valor) return ''
    return String(valor).slice(0, 10).replace(/T.*$/, '')
  }

  function hojeYMD() {
    var agora = new Date()
    var m = agora.getMonth() + 1
    var d = agora.getDate()
    return (
      agora.getFullYear() + '-' + (m < 10 ? '0' + m : '' + m) + '-' + (d < 10 ? '0' + d : '' + d)
    )
  }

  try {
    var record = e.record
    if (record.collection().name !== 'cc_salarios') return

    var original = record.original()
    var inicioOriginal = dataYMD(original.getString('vigencia_inicio'))
    var inicio = dataYMD(record.getString('vigencia_inicio'))
    var fim = dataYMD(record.getString('vigencia_fim'))

    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(inicio)) {
      throw new BadRequestError('Vigência inicial inválida: informe uma data válida.')
    }
    if (fim !== '' && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fim)) {
      throw new BadRequestError('Vigência final inválida: informe uma data válida ou deixe vazia.')
    }
    if (fim !== '' && fim < inicio) {
      throw new BadRequestError(
        'Vigência incompatível: o fim (' +
          fim +
          ') não pode ser anterior ao início (' +
          inicio +
          ').',
      )
    }

    // Histórico imutável: vigência já INICIADA não altera valor/início/
    // funcionário; apenas o ENCERRAMENTO pode ser definido ou movido adiante.
    var iniciada = inicioOriginal !== '' && inicioOriginal <= hojeYMD()
    if (iniciada) {
      var fimOriginal = dataYMD(original.getString('vigencia_fim'))
      var mudouInicio = inicio !== inicioOriginal
      var mudouValor =
        Number(record.getNumber('valor') || 0) !== Number(original.getNumber('valor') || 0)
      var mudouFuncionario =
        '' + (record.getString('funcionario') || '') !==
        '' + (original.getString('funcionario') || '')
      var fimAvancou = fim !== fimOriginal && (fimOriginal === '' || fim > fimOriginal)
      if (mudouInicio || mudouValor || mudouFuncionario || !fimAvancou) {
        throw new BadRequestError(
          'Esta vigência salarial já está em vigor desde ' +
            inicioOriginal +
            ' (histórico imutável). Somente o ENCERRAMENTO (vigência fim) pode ser definido ou movido para frente. Para novo salário a partir de uma data, crie uma NOVA vigência.',
        )
      }
    }

    var funcionarioId = record.getString('funcionario')
    if (!funcionarioId) {
      throw new BadRequestError('Vigência salarial exige um funcionário vinculado.')
    }
    var nomeFuncionario = 'funcionário'
    try {
      var funcionario2 = e.app.findRecordById('funcionarios', funcionarioId)
      if (funcionario2 && funcionario2.getString('nome')) {
        nomeFuncionario = funcionario2.getString('nome')
      }
    } catch (errNome2) {
      // relation inválida — a validação obrigatória do PocketBase recusará
    }

    var vigencias = e.app.findRecordsByFilter(
      'cc_salarios',
      "funcionario = '" + funcionarioId + "' && id != '" + record.id + "'",
      'vigencia_inicio',
      0,
      0,
    )
    var fimA = fim === '' ? '9999-12-31' : fim
    for (var j = 0; j < vigencias.length; j++) {
      var outraInicio2 = dataYMD(vigencias[j].getString('vigencia_inicio'))
      var outraFim2 = dataYMD(vigencias[j].getString('vigencia_fim'))
      var fimB2 = outraFim2 === '' ? '9999-12-31' : outraFim2
      if (inicio <= fimB2 && outraInicio2 <= fimA) {
        throw new BadRequestError(
          'Conflito de vigência: ' +
            nomeFuncionario +
            ' já possui salário vigente nesse período (' +
            outraInicio2 +
            ' a ' +
            (outraFim2 === '' ? 'em vigor' : outraFim2) +
            ').',
        )
      }
    }
  } catch (err) {
    if (err && err.name === 'BadRequestError') throw err
    throw new BadRequestError(
      'Validação de vigências salariais falhou (operação revertida): ' +
        (err && err.message ? err.message : err),
    )
  }
}, 'cc_salarios')
