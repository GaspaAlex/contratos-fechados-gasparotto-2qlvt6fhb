// BUILD C1-B — VALIDAÇÃO DE VÍNCULO DE PARTICIPANTE (cc_participantes)
// ========================================================================
// Com a relação opcional para cc_colaboradores (C1-B), um vínculo de
// participante pode apontar para UM funcionário do Cartão de Ponto OU para UM
// colaborador do cadastro próprio do módulo — nunca ambos, nunca nenhum.
// A validação roda NO BACKEND, na gravação (criação E atualização):
// onRecordCreateExecute / onRecordUpdateExecute disparam DENTRO da transação
// do save — lançar aqui reverte a operação inteira (mesma convenção do hook
// cc_salarios_vigencias deste módulo).
//
// Índices únicos no banco completam a proteção de duplicidade:
//   - idx_cc_participantes_funcionario_preenchido (partial): 1 vínculo por
//     funcionário preenchido;
//   - idx_cc_colaboradores_nome (COLLATE NOCASE): 1 cadastro por nome.
//
// ⚠ RUNTIME JSVM (goja): POOL SEPARADO — TODA a lógica vive DENTRO de cada
// callback (mesma convenção dos demais hooks do projeto).

onRecordCreateExecute(function (e) {
  e.next()

  try {
    var record = e.record
    if (record.collection().name !== 'cc_participantes') return

    var funcionarioId = record.getString('funcionario')
    var colaboradorId = record.getString('colaborador')

    if (funcionarioId && colaboradorId) {
      throw new BadRequestError(
        'Vínculo inválido: escolha UM alvo — funcionário do Cartão de Ponto OU colaborador do cadastro do módulo (não ambos).',
      )
    }
    if (!funcionarioId && !colaboradorId) {
      throw new BadRequestError(
        'Vínculo inválido: informe o funcionário do Cartão de Ponto OU o colaborador do cadastro do módulo.',
      )
    }

    var alvoId = funcionarioId || colaboradorId
    var campo = funcionarioId ? 'funcionario' : 'colaborador'
    var outros = e.app.findRecordsByFilter(
      'cc_participantes',
      campo + " = '" + alvoId + "' && id != '" + record.id + "'",
      '',
      1,
      0,
    )
    if (outros.length > 0) {
      throw new BadRequestError(
        'Duplicidade: já existe vínculo de participante para este ' +
          (campo === 'funcionario' ? 'funcionário' : 'colaborador') +
          '. Reative o vínculo existente em vez de criar outro.',
      )
    }
  } catch (err) {
    if (err && err.name === 'BadRequestError') throw err
    throw new BadRequestError(
      'Validação de vínculo de participante falhou (operação revertida): ' +
        (err && err.message ? err.message : err),
    )
  }
}, 'cc_participantes')

onRecordUpdateExecute(function (e) {
  e.next()

  try {
    var record = e.record
    if (record.collection().name !== 'cc_participantes') return

    var funcionarioId = record.getString('funcionario')
    var colaboradorId = record.getString('colaborador')

    if (funcionarioId && colaboradorId) {
      throw new BadRequestError(
        'Vínculo inválido: escolha UM alvo — funcionário do Cartão de Ponto OU colaborador do cadastro do módulo (não ambos).',
      )
    }
    if (!funcionarioId && !colaboradorId) {
      throw new BadRequestError(
        'Vínculo inválido: informe o funcionário do Cartão de Ponto OU o colaborador do cadastro do módulo.',
      )
    }

    var alvoId = funcionarioId || colaboradorId
    var campo = funcionarioId ? 'funcionario' : 'colaborador'
    var outros = e.app.findRecordsByFilter(
      'cc_participantes',
      campo + " = '" + alvoId + "' && id != '" + record.id + "'",
      '',
      1,
      0,
    )
    if (outros.length > 0) {
      throw new BadRequestError(
        'Duplicidade: já existe vínculo de participante para este ' +
          (campo === 'funcionario' ? 'funcionário' : 'colaborador') +
          '. Reative o vínculo existente em vez de criar outro.',
      )
    }
  } catch (err) {
    if (err && err.name === 'BadRequestError') throw err
    throw new BadRequestError(
      'Validação de vínculo de participante falhou (operação revertida): ' +
        (err && err.message ? err.message : err),
    )
  }
}, 'cc_participantes')
