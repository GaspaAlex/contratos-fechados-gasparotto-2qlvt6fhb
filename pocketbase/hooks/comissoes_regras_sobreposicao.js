// BUILD F1 — PROTEÇÃO CONTRA SOBREPOSIÇÃO DE VIGÊNCIAS (comissoes_regras)
// ========================================================================
// Nenhuma competência pode ter DUAS regras do mesmo colaborador. A validação
// roda NO BACKEND, na gravação (criação E atualização):
//   onRecordCreateExecute / onRecordUpdateExecute disparam DENTRO da
//   transação do save — lançar aqui reverte a operação inteira (atomicidade
//   garantida também contra escritas concorrentes: a leitura usada na
//   validação roda na mesma conexão/transação do gravador).
//
// Períodos são INCLUSIVOS (a competência pertence a [inicio, fim]):
//   [2026-11, vazio] e [2027-01, vazio]    → coexistem;
//   [2026-11, vazio] e [2026-11, 2027-06]  → SOBREPÕEM;
//   [2026-11, 2026-12] e [2027-01, vazio]  → coexistem (bordas inclusivas).
//
// Edição de regra INICIADA (vigencia_inicio <= competência atual): histórico
// imutável — não se altera valor/modaisidade/vigencia_inicio/colaborador;
// apenas o ENCERRAMENTO (vigencia_fim) pode ser definido ou movido para
// frente. Novo valor futuro = nova regra + fechamento da anterior.
//
// ⚠ RUNTIME JSVM (goja): POOL SEPARADO — TODA a lógica vive DENTRO de cada
// callback (mesma convenção dos demais hooks do projeto).

onRecordCreateExecute(function (e) {
  e.next()

  function validaCompetencia(valor) {
    return typeof valor === 'string' && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(valor)
  }

  function competenciaAtual() {
    var agora = new Date()
    var mes = agora.getUTCMonth() + 1
    return agora.getUTCFullYear() + '-' + (mes < 10 ? '0' + mes : '' + mes)
  }

  function minCompetencia() {
    return '2026-11'
  }

  try {
    var record = e.record
    if (record.collection().name !== 'comissoes_regras') return

    var inicio = '' + (record.getString('vigencia_inicio') || '')
    var fim = '' + (record.getString('vigencia_fim') || '')

    if (!validaCompetencia(inicio)) {
      throw new BadRequestError(
        'Vigência inicial inválida: use o formato AAAA-MM com mês entre 01 e 12.',
      )
    }
    if (fim !== '' && !validaCompetencia(fim)) {
      throw new BadRequestError(
        'Vigência final inválida: use o formato AAAA-MM com mês entre 01 e 12.',
      )
    }
    if (fim !== '' && fim < inicio) {
      throw new BadRequestError(
        'Vigência inválida: o encerramento (' +
          fim +
          ') não pode ser anterior ao início (' +
          inicio +
          ').',
      )
    }
    if (inicio < minCompetencia()) {
      throw new BadRequestError(
        'Competência anterior a nov/2026 está fora do novo controle de comissões por colaborador.',
      )
    }

    var colaboradorId = record.getString('colaborador')
    if (!colaboradorId) {
      throw new BadRequestError('Regra exige um colaborador vinculado.')
    }
    var nomeColaborador = 'colaborador'
    try {
      var colaborador = e.app.findRecordById('comissoes_colaboradores', colaboradorId)
      if (colaborador && colaborador.getString('nome')) {
        nomeColaborador = colaborador.getString('nome')
      }
    } catch (errNome) {
      // relation inválida — a validação obrigatória do PocketBase recusará
    }

    // Sobreposição com QUALQUER outra regra do mesmo colaborador (períodos
    // inclusivos; vigência sem fim conta como aberta até 9999-99).
    var regras = e.app.findRecordsByFilter(
      'comissoes_regras',
      "colaborador = '" + colaboradorId + "' && id != '" + record.id + "'",
      'vigencia_inicio',
      0,
      0,
    )
    var fimA = fim === '' ? '9999-99' : fim
    for (var i = 0; i < regras.length; i++) {
      var outraInicio = '' + (regras[i].getString('vigencia_inicio') || '')
      var outraFim = '' + (regras[i].getString('vigencia_fim') || '')
      var fimB = outraFim === '' ? '9999-99' : outraFim
      if (inicio <= fimB && outraInicio <= fimA) {
        throw new BadRequestError(
          'Conflito de vigência: ' +
            nomeColaborador +
            ' já possui regra sobreposta (' +
            outraInicio +
            ' a ' +
            (outraFim === '' ? 'em vigor' : outraFim) +
            '). Para alterar valores futuros, feche a vigência anterior (vigencia_fim) e crie uma NOVA regra.',
        )
      }
    }
  } catch (err) {
    if (err && err.name === 'BadRequestError') throw err
    throw new BadRequestError(
      'Validação de vigências falhou (operação revertida): ' +
        (err && err.message ? err.message : err),
    )
  }
}, 'comissoes_regras')

onRecordUpdateExecute(function (e) {
  e.next()

  function validaCompetencia(valor) {
    return typeof valor === 'string' && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(valor)
  }

  function competenciaAtual() {
    var agora = new Date()
    var mes = agora.getUTCMonth() + 1
    return agora.getUTCFullYear() + '-' + (mes < 10 ? '0' + mes : '' + mes)
  }

  try {
    var record = e.record
    if (record.collection().name !== 'comissoes_regras') return

    var original = record.original()
    var inicioOriginal = '' + (original.getString('vigencia_inicio') || '')
    var inicio = '' + (record.getString('vigencia_inicio') || '')
    var fim = '' + (record.getString('vigencia_fim') || '')

    if (!validaCompetencia(inicio)) {
      throw new BadRequestError(
        'Vigência inicial inválida: use o formato AAAA-MM com mês entre 01 e 12.',
      )
    }
    if (fim !== '' && !validaCompetencia(fim)) {
      throw new BadRequestError(
        'Vigência final inválida: use o formato AAAA-MM com mês entre 01 e 12.',
      )
    }
    if (fim !== '' && fim < inicio) {
      throw new BadRequestError(
        'Vigência inválida: o encerramento (' +
          fim +
          ') não pode ser anterior ao início (' +
          inicio +
          ').',
      )
    }
    if (inicio < '2026-11') {
      throw new BadRequestError(
        'Competência anterior a nov/2026 está fora do novo controle de comissões por colaborador.',
      )
    }

    // Histórico imutável: regra já INICIADA só permite avançar o encerramento.
    var iniciada = inicioOriginal !== '' && inicioOriginal <= competenciaAtual()
    if (iniciada) {
      var fimOriginal = '' + (original.getString('vigencia_fim') || '')
      var mudouInicio = inicio !== inicioOriginal
      var mudouValor =
        Number(record.getNumber('valor') || 0) !== Number(original.getNumber('valor') || 0)
      var mudouModalidade =
        '' + (record.getString('modalidade') || '') !==
        '' + (original.getString('modalidade') || '')
      var mudouColaborador =
        '' + (record.getString('colaborador') || '') !==
        '' + (original.getString('colaborador') || '')
      var fimAvancou = fim !== fimOriginal && (fimOriginal === '' || fim > fimOriginal)
      if (mudouInicio || mudouValor || mudouModalidade || mudouColaborador || !fimAvancou) {
        throw new BadRequestError(
          'Esta regra já está em vigor desde ' +
            inicioOriginal +
            ' (histórico imutável). Somente o ENCERRAMENTO (vigencia_fim) pode ser definido ou movido para frente. Para novo valor a partir de uma competência, crie uma NOVA regra com nova vigência.',
        )
      }
    }

    // Sobreposição (mesma checagem da criação, contra as OUTRAS regras).
    var colaboradorId = record.getString('colaborador')
    if (!colaboradorId) {
      throw new BadRequestError('Regra exige um colaborador vinculado.')
    }
    var nomeColaborador = 'colaborador'
    try {
      var colaborador = e.app.findRecordById('comissoes_colaboradores', colaboradorId)
      if (colaborador && colaborador.getString('nome')) {
        nomeColaborador = colaborador.getString('nome')
      }
    } catch (errNome) {
      // relation inválida — a validação obrigatória do PocketBase recusará
    }

    var regras = e.app.findRecordsByFilter(
      'comissoes_regras',
      "colaborador = '" + colaboradorId + "' && id != '" + record.id + "'",
      'vigencia_inicio',
      0,
      0,
    )
    var fimA = fim === '' ? '9999-99' : fim
    for (var i = 0; i < regras.length; i++) {
      var outraInicio = '' + (regras[i].getString('vigencia_inicio') || '')
      var outraFim = '' + (regras[i].getString('vigencia_fim') || '')
      var fimB = outraFim === '' ? '9999-99' : outraFim
      if (inicio <= fimB && outraInicio <= fimA) {
        throw new BadRequestError(
          'Conflito de vigência: ' +
            nomeColaborador +
            ' já possui regra sobreposta (' +
            outraInicio +
            ' a ' +
            (outraFim === '' ? 'em vigor' : outraFim) +
            ').',
        )
      }
    }
  } catch (err) {
    if (err && err.name === 'BadRequestError') throw err
    throw new BadRequestError(
      'Validação de vigências falhou (operação revertida): ' +
        (err && err.message ? err.message : err),
    )
  }
}, 'comissoes_regras')
