// pocketbase/hooks/protocolo_vinculo_contrato.js
//
// VÍNCULO AUTOMÁTICO PROTOCOLO ↔ CONTRATOS FECHADOS
// =====================================================
// Vínculo automático somente por CHAVE SEGURA (mesma regra do backfill da
// migration 0102/0104):
//   A) fone normalizado (só dígitos) de protocolo.fone == contratos_fechados.fone
//   B) benefício/tipo semanticamente equivalente: protocolo.tipo_acao (relation
//      → tipos_acao, comparado pelo NOME expandido) == contratos_fechados.beneficio
// Camadas:
//   1. exatamente 1 contrato com fone+tipo → vincula (dcontrato NÃO exigido);
//   2. 2+ candidatos → desempate por dcontrato (protocolo.dcontrato ===
//      contrato.dcontrato, 10 primeiros chars); se exatamente 1 bater → vincula;
//   3. ainda 2+ → NÃO vincula (ambíguo);
//   4. nenhum candidato → deixa vazio.
// NUNCA usa nome, responsável ou origem como chave automática.
// NUNCA substitui relation já preenchida (manual ou anterior) — o vínculo
// automático só preenche quando a relation está VAZIA e só com match seguro.
//
// ORDEM DE EXECUÇÃO: onRecordAfterCreateSuccess / onRecordAfterUpdateSuccess
// (pós-persistência, mesmo padrão dos hooks da Central Auxílio-Acidente).
// No update, reavalia SOMENTE quando fone/tipo_acao/dcontrato mudaram.
//
// ⚠ RUNTIME JSVM (goja): POOL SEPARADO — declarações/constantes de nível
// superior NÃO são visíveis dentro dos callbacks (ReferenceError em runtime).
// TODA a lógica e constantes (inclusive o logger) vivem DENTRO de cada
// callback, como função/variável local — mesma convenção do hook
// leads_aux_acidente_vinculo.js.

// Protocolo CRIADO: tenta vincular automaticamente (match seguro).
onRecordAfterCreateSuccess((e) => {
  e.next()

  function digitos(value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }
  function normTexto(value) {
    return ('' + (value || '')).trim().toLowerCase().replace(/\s+/g, ' ')
  }
  function ymd(value) {
    return ('' + (value || '')).substring(0, 10)
  }
  function log(msg, ctx) {
    var parts = ['[PROTOCOLO_VINCULO] ' + msg]
    for (var k in ctx || {}) {
      if (
        Object.prototype.hasOwnProperty.call(ctx || {}, k) &&
        ctx[k] !== undefined &&
        ctx[k] !== null &&
        ctx[k] !== ''
      ) {
        parts.push(k + '=' + ctx[k])
      }
    }
    console.log(parts.join(' | '))
  }

  // Encontra o contrato "seguro" para o protocolo (ou null).
  // Camada 1: 1 único candidato fone+benefício → ele mesmo (dcontrato não exigido).
  // Camada 2: 2+ candidatos → desempate por dcontrato; se exatamente 1 bater → ele.
  // Camada 3/4: ambíguo ou nenhum → null (relation permanece como está).
  function encontrarContrato(app, protocolo) {
    var tel = digitos(protocolo.getString('fone'))
    if (!tel) {
      log('sem telefone — nada a fazer', { protocoloId: protocolo.id })
      return null
    }

    // Nome expandido do tipo de ação (relation → tipos_acao).
    var beneficioProtocolo = ''
    try {
      var tipo = app.findRecordById('tipos_acao', protocolo.getString('tipo_acao'))
      beneficioProtocolo = tipo.getString('nome')
    } catch (err) {
      beneficioProtocolo = ''
    }
    if (!beneficioProtocolo) {
      log('sem tipo_acao resolvido — nada a fazer', { protocoloId: protocolo.id })
      return null
    }

    // Candidatos: fone + benefício equivalentes.
    var candidatos = []
    var contratos = app.findRecordsByFilter('contratos_fechados', '', '-created', 0, 0)
    for (var i = 0; i < contratos.length; i++) {
      var c = contratos[i]
      if (digitos(c.getString('fone')) !== tel) continue
      if (normTexto(c.getString('beneficio')) !== normTexto(beneficioProtocolo)) continue
      candidatos.push(c)
    }

    if (candidatos.length === 1) {
      // Camada 1: único candidato — dcontrato NÃO é exigido (evita falso
      // negativo por data digitada diferente).
      return candidatos[0]
    }

    if (candidatos.length > 1) {
      // Camada 2: desempate por dcontrato igual.
      var dProto = ymd(protocolo.getString('dcontrato'))
      if (dProto) {
        var porData = []
        for (var j = 0; j < candidatos.length; j++) {
          if (ymd(candidatos[j].getString('dcontrato')) === dProto) porData.push(candidatos[j])
        }
        if (porData.length === 1) return porData[0]
      }
      // Camada 3: ainda 2+ → ambíguo, não vincula.
      log('ambíguo — não vinculou', {
        protocoloId: protocolo.id,
        fone: protocolo.getString('fone'),
        beneficio: beneficioProtocolo,
        candidatos: candidatos.length,
      })
      return null
    }

    // Camada 4: nenhum candidato.
    log('nenhum candidato — não vinculou', {
      protocoloId: protocolo.id,
      fone: protocolo.getString('fone'),
      beneficio: beneficioProtocolo,
    })
    return null
  }

  try {
    if (e.record.collection().name !== 'protocolo') return

    var protocolo = e.record
    var atuais = protocolo.getStringSlice('contratos') || []
    if (atuais.length > 0) {
      log('relation já preenchida — não altera', {
        protocoloId: protocolo.id,
        contratos: atuais.join(','),
      })
      return
    }

    var escolhido = encontrarContrato(e.app, protocolo)
    if (!escolhido) return

    protocolo.set('contratos', [escolhido.id])
    e.app.save(protocolo)
    log('vínculo automático criado', {
      protocoloId: protocolo.id,
      contratoId: escolhido.id,
    })
  } catch (err) {
    console.log(
      '[PROTOCOLO_VINCULO] ERRO (ignorado): ' +
        (err && err.message ? err.message : err) +
        ' | protocoloId=' +
        (e.record && e.record.id),
    )
  }
}, 'protocolo')

// Protocolo EDITADO: reavalia SOMENTE quando fone/tipo_acao/dcontrato mudaram
// e a relation ainda está vazia (nunca substitui vínculo existente).
onRecordAfterUpdateSuccess((e) => {
  e.next()

  function digitos(value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }
  function normTexto(value) {
    return ('' + (value || '')).trim().toLowerCase().replace(/\s+/g, ' ')
  }
  function ymd(value) {
    return ('' + (value || '')).substring(0, 10)
  }
  function log(msg, ctx) {
    var parts = ['[PROTOCOLO_VINCULO] ' + msg]
    for (var k in ctx || {}) {
      if (
        Object.prototype.hasOwnProperty.call(ctx || {}, k) &&
        ctx[k] !== undefined &&
        ctx[k] !== null &&
        ctx[k] !== ''
      ) {
        parts.push(k + '=' + ctx[k])
      }
    }
    console.log(parts.join(' | '))
  }

  function encontrarContrato(app, protocolo) {
    var tel = digitos(protocolo.getString('fone'))
    if (!tel) return null

    var beneficioProtocolo = ''
    try {
      var tipo = app.findRecordById('tipos_acao', protocolo.getString('tipo_acao'))
      beneficioProtocolo = tipo.getString('nome')
    } catch (err) {
      beneficioProtocolo = ''
    }
    if (!beneficioProtocolo) return null

    var candidatos = []
    var contratos = app.findRecordsByFilter('contratos_fechados', '', '-created', 0, 0)
    for (var i = 0; i < contratos.length; i++) {
      var c = contratos[i]
      if (digitos(c.getString('fone')) !== tel) continue
      if (normTexto(c.getString('beneficio')) !== normTexto(beneficioProtocolo)) continue
      candidatos.push(c)
    }

    if (candidatos.length === 1) return candidatos[0]

    if (candidatos.length > 1) {
      var dProto = ymd(protocolo.getString('dcontrato'))
      if (dProto) {
        var porData = []
        for (var j = 0; j < candidatos.length; j++) {
          if (ymd(candidatos[j].getString('dcontrato')) === dProto) porData.push(candidatos[j])
        }
        if (porData.length === 1) return porData[0]
      }
      log('update ambíguo — não vinculou', {
        protocoloId: protocolo.id,
        candidatos: candidatos.length,
      })
      return null
    }

    log('update sem match — não vinculou', { protocoloId: protocolo.id })
    return null
  }

  try {
    if (e.record.collection().name !== 'protocolo') return

    var protocolo = e.record
    if ((protocolo.getStringSlice('contratos') || []).length > 0) return

    var original = protocolo.original()
    var telMudou =
      '' + (protocolo.getString('fone') || '') !== '' + (original.getString('fone') || '')
    var tipoMudou =
      '' + (protocolo.getString('tipo_acao') || '') !== '' + (original.getString('tipo_acao') || '')
    var dcontrMudou =
      '' + (protocolo.getString('dcontrato') || '') !== '' + (original.getString('dcontrato') || '')
    if (!telMudou && !tipoMudou && !dcontrMudou) return

    var escolhido = encontrarContrato(e.app, protocolo)
    if (!escolhido) return

    protocolo.set('contratos', [escolhido.id])
    e.app.save(protocolo)
    log('vínculo automático criado no update', {
      protocoloId: protocolo.id,
      contratoId: escolhido.id,
    })
  } catch (err) {
    console.log(
      '[PROTOCOLO_VINCULO] ERRO update (ignorado): ' +
        (err && err.message ? err.message : err) +
        ' | protocoloId=' +
        (e.record && e.record.id),
    )
  }
}, 'protocolo')
