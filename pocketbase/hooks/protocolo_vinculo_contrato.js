// pocketbase/hooks/protocolo_vinculo_contrato.js
//
// AUTOMATIZAÇÃO PARA NOVOS REGISTROS — integração Protocolo ↔ Contratos Fechados
// ==============================================================================
// Aplica a MESMA regra de correspondência do backfill (0102) a protocolos novos
// e editados:
//   - Telefone normalizado apenas pelos DÍGITOS.
//   - Benefício/tipo de ação equivalentes (beneficio texto vs nome do tipo_acao).
//   - Cenário 1: exatamente 1 contrato com telefone+benefício → vincula.
//   - Cenário 2: 2+ candidatos → desempate por dcontrato; se exatamente 1
//     bater → vincula esse.
//   - Cenário 3: ainda ambíguo → NÃO vincula.
//   - Cenário 4: nenhum candidato → relation fica vazia.
//   - NUNCA substitui automaticamente uma relation já preenchida: se o registro
//     já tinha contratos, o vínculo é preservado como está.
//   - NOME, responsável e origem NÃO são critérios de vínculo.
//   - Nenhuma mudança em contratos_fechados ou em outros campos do protocolo.
//
// ⚠ RUNTIME JSVM: sem imports/modules — funções locais e e.record/e.app.
onRecordAfterCreateRequest((e) => {
  autoVincular(e.record, e.app, 'create')
}, 'protocolo')

onRecordAfterUpdateRequest((e) => {
  autoVincular(e.record, e.app, 'update')
}, 'protocolo')

function autoVincular(record, app, origem) {
  var digitos = function (value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }
  var normTexto = function (value) {
    return ('' + (value || '')).trim().toLowerCase().replace(/\s+/g, ' ')
  }
  var ymd = function (value) {
    return ('' + (value || '')).substring(0, 10)
  }
  var log = function (msg, ctx) {
    var parts = ['[PROTOCOLO_VINCULO] ' + msg]
    for (var k in ctx) {
      if (
        Object.prototype.hasOwnProperty.call(ctx, k) &&
        ctx[k] !== undefined &&
        ctx[k] !== null &&
        ctx[k] !== ''
      ) {
        parts.push(k + '=' + ctx[k])
      }
    }
    console.log(parts.join(' | '))
  }

  var atuais = record.getStringSlice('contratos') || []
  if (atuais.length > 0) {
    log('relation já preenchida — preservada sem alteração', {
      protocoloId: record.id,
      origem: origem,
      contratos: atuais.join(','),
    })
    return
  }

  var tel = digitos(record.getString('fone'))
  var beneficio = ''
  var tipoAcaoId = record.getString('tipo_acao')
  if (tipoAcaoId) {
    try {
      var tipo = app.findRecordById('tipos_acao', tipoAcaoId)
      if (tipo) beneficio = tipo.getString('nome')
    } catch (err) {
      beneficio = ''
    }
  }
  if (!tel || !beneficio) {
    log('sem telefone ou sem tipo de ação — nada a vincular', {
      protocoloId: record.id,
      origem: origem,
    })
    return
  }

  var contratos = app.findRecordsByFilter('contratos_fechados', '', '', 0, 0)
  var candidatos = []
  for (var i = 0; i < contratos.length; i++) {
    var c = contratos[i]
    if (digitos(c.getString('fone')) !== tel) continue
    if (normTexto(c.getString('beneficio')) !== normTexto(beneficio)) continue
    candidatos.push(c)
  }

  var escolhido = null
  if (candidatos.length === 1) {
    escolhido = candidatos[0]
  } else if (candidatos.length > 1) {
    var dProto = ymd(record.getString('dcontrato'))
    if (dProto) {
      var porData = []
      for (var d = 0; d < candidatos.length; d++) {
        if (ymd(candidatos[d].getString('dcontrato')) === dProto) porData.push(candidatos[d])
      }
      if (porData.length === 1) escolhido = porData[0]
    }
  }

  if (!escolhido) {
    log('nenhum candidato seguro — relation permanece vazia', {
      protocoloId: record.id,
      origem: origem,
      candidatos: candidatos.length,
    })
    return
  }

  record.set('contratos', [escolhido.id])
  app.save(record)
  log('vínculo automático criado', {
    protocoloId: record.id,
    contratoId: escolhido.id,
    origem: origem,
  })
}
