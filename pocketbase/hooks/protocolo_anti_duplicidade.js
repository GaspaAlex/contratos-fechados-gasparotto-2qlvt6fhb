/// <reference path="../pb_data/types.d.ts" />
//
// Proteção anti-duplicidade para a ação "Abrir em Protocolo" (Contratos Fechados).
//
// Regra: um mesmo contrato (contratos_fechados) não pode ficar vinculado a mais
// de um registro de `protocolo` pela relation `contratos`. Roda no onCreate de
// `protocolo` como hook de MODELO (onRecordCreate), que executa DENTRO da
// transação de gravação do PocketBase — verificação e gravação são atômicas
// contra concorrência: se duas tentativas passarem ao mesmo tempo, a segunda
// encontra o registro já persistido pela primeira e recusa a criação.
//
// - Registros sem `contratos` preenchido (cadastros manuais) não são afetados.
// - Não altera vínculos existentes (nunca edita outros registros).
// - O cliente reconhece o marcador PROTOCOLO_DUPLICADO na mensagem de erro,
//   reconsulta por `contratos ?= '<id>'` e abre o registro já salvo.
//
// EXCEÇÃO ÚNICA — "Novo protocolo do mesmo caso" (reabertura/reajuizamento):
// quando o novo registro carrega `caso_origem` apontando para um protocolo
// existente, o bloqueio por contrato é SUSPENSO. A validação completa do fluxo
// (origem existente, justificativa obrigatória, cadeia até a raiz, contratos
// compartilhados com a raiz) é feita NO BACKEND por
// protocolo_novo_mesmo_caso.js — uma marcação arbitrária do frontend sem esses
// requisitos continua sendo recusada lá. Sem `caso_origem`, o bloqueio atual
// permanece integral: cadastro normal duplicado por engano continua bloqueado.
//
// O hook existente protocolo_vinculo_contrato.js (direção Protocolo→Contrato)
// permanece intacto.

onRecordCreate((e) => {
  const contratoIds = e.record.getStringSlice('contratos')
  if (contratoIds.length === 0) {
    return e.next()
  }

  // Exceção controlada: fluxo "Novo protocolo do mesmo caso" (validado em
  // protocolo_novo_mesmo_caso.js — a checagem completa acontece lá).
  const casoOrigem = ('' + (e.record.getString('caso_origem') || '')).trim()
  if (casoOrigem !== '') {
    return e.next()
  }

  for (const contratoId of contratoIds) {
    const existentes = $app.findRecordsByFilter(
      'protocolo',
      'contratos ?= {:contratoId}',
      '-created',
      1,
      0,
      { contratoId },
    )
    if (existentes.length > 0) {
      const nomeExistente = existentes[0].getString('nome')
      throw new BadRequestError(
        'PROTOCOLO_DUPLICADO: Já existe um protocolo vinculado a este contrato' +
          (nomeExistente ? ' (' + nomeExistente + ')' : '') +
          '. Abra o registro existente.',
      )
    }
  }

  return e.next()
}, 'protocolo')
