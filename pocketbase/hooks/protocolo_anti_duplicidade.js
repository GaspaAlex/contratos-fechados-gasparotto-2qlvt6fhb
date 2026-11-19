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
// O hook existente protocolo_vinculo_contrato.js (direção Protocolo→Contrato)
// permanece intacto.

onRecordCreate((e) => {
  const contratoIds = e.record.getStringSlice('contratos')
  if (contratoIds.length === 0) {
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
