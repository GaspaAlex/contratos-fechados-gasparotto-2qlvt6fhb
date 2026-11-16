// pocketbase/hooks/leads_aux_acidente_vinculo.js
//
// AUTOMAÇÃO DO VÍNCULO CONTRATOS FECHADOS → CENTRAL AUXÍLIO-ACIDENTE
// ================================================================
// Sempre que um contrato de AUXÍLIO-ACIDENTE é cadastrado (ou tem o telefone
// atualizado) em `contratos_fechados`, ou um lead é criado/tem o telefone
// alterado em `leads_aux_acidente`, o sistema procura uma correspondência
// INEQUÍVOCA pelo TELEFONE (comparando apenas os DÍGITOS — máscara ignorada)
// e acrescenta o ID do contrato à relation múltipla `leads_aux_acidente.contratos`.
//
// ⚠ ORDEM OBRIGATÓRIA (bug 0.0.1082 corrigido): em TODOS os eventos a lógica
// de vínculo roda APÓS `e.next()` — ou seja, DEPOIS da persistência do
// registro. Antes, a validação da relation `contratos` falhava com
// "Failed to find all relation records with the provided ids" porque o ID do
// contrato recém-criado ainda não existia no banco. Além disso, o lead é
// SEMPRE recarregado fresco do banco (findRecordById) antes de salvar —
// nunca se reutiliza o objeto capturado antes do save, para não sobrescrever
// edições concorrentes.
//
// REGRA CONFIÁVEL PARA RECONHECER AUXÍLIO-ACIDENTE (definida por inspeção dos
// dados reais — migration 0099 e dados atuais):
//   EXCLUSIVAMENTE `contratos_fechados.beneficio === "Aux. Acidente"` (valor exato).
//   `campanha_origem` NÃO é confiável — contratos de BPC/LOAS e Aux. Doença
//   carregam a campanha "Aux. Acidente META". Nenhum outro campo distingue
//   o tipo. Nunca se usa nome para matching (nunca fuzzy).
//
// REGRAS DE SEGURANÇA (do pedido do usuário, preservadas):
//  - Somente vínculo quando existe EXATAMENTE 1 lead com o telefone normalizado
//    igual. 0 leads → nada; mais de 1 → não escolhe automaticamente (log).
//    (Exceção documentada: lead → contratos, quando TODOS os candidatos são do
//    mesmo telefone, o lead pode acumular vários contratos da mesma pessoa.)
//  - Telefone vazio/inválido → nenhum vínculo; nunca erro.
//  - Idempotente: se o ID do contrato já está em `contratos`, não adiciona de novo.
//  - Segundo contrato válido é ADICIONADO à relation existente, nunca substitui.
//  - NÃO remove vínculos existentes quando o telefone muda depois.
//  - NÃO altera `status_funil`, motivo ou datas (a relation `contratos` é a
//    fonte de verdade de conversão).
//  - NUNCA impede o salvamento normal (o cadastro do contrato é prioritário):
//    toda a lógica roda DEPOIS do save e em try/catch — erro aqui nunca propaga.
//  - NÃO altera `contratos_fechados` (sem campo novo, sem relation inversa).
//
// ⚠ RUNTIME JSVM (goja): TODA a lógica fica DENTRO de cada callback —
// declarações/variáveis de nível superior não são visíveis nos callbacks
// (mesma convenção do hook cron_revisao_contratos_email.js).
//
// Eventos que disparam a automação:
//  - onRecordCreate('contratos_fechados')                     → tenta vincular ao lead
//  - onRecordUpdate('contratos_fechados')   [fone alterado]   → re-tenta (sem remover)
//  - onRecordCreate('leads_aux_acidente')                     → busca contratos compatíveis
//  - onRecordUpdate('leads_aux_acidente')   [telefone alterado] → busca contratos

// -------------------------------------------------------------
// 1) CONTRATO CRIADO → vincular ao lead (se correspondência inequívoca)
//    PÓS-SAVE: e.next() primeiro (persiste o contrato), vínculo depois.
// -------------------------------------------------------------
onRecordCreate((e) => {
  function normalizeDigits(value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }

  function log(msg, ctx) {
    var parts = ['[VINCULO_AUX_ACIDENTE] ' + msg]
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

  function vincularContratoAoLead(app, contrato) {
    try {
      var telDigits = normalizeDigits(contrato.getString('fone'))
      if (!telDigits) {
        log('skip telefone vazio', { contratoId: contrato.id, nome: contrato.getString('nome') })
        return
      }

      var beneficio = (contrato.getString('beneficio') || '').trim()
      if (beneficio !== 'Aux. Acidente') {
        log('contrato fora de Aux. Acidente — nenhum vínculo automático', {
          contratoId: contrato.id,
          beneficio: beneficio,
          nome: contrato.getString('nome'),
        })
        return
      }

      var leads = app.findRecordsByFilter(
        'leads_aux_acidente',
        "telefone ~ '" + telDigits + "'",
        'created',
        0,
        0,
      )

      var candidatos = []
      for (var i = 0; i < leads.length; i++) {
        if (normalizeDigits(leads[i].getString('telefone')) === telDigits)
          candidatos.push(leads[i].id)
      }

      if (candidatos.length === 0) {
        log('nenhum lead correspondente', {
          contratoId: contrato.id,
          fone: contrato.getString('fone'),
        })
        return
      }
      if (candidatos.length > 1) {
        log('múltiplos candidatos — nenhum vínculo automático', {
          contratoId: contrato.id,
          fone: contrato.getString('fone'),
          candidatos: candidatos.join(','),
        })
        return
      }

      // Recarrega o lead FRESCO do banco — o contrato já está persistido aqui,
      // então a relation valida normalmente. Nunca reutiliza objeto antigo.
      var lead = app.findRecordById('leads_aux_acidente', candidatos[0])
      var contratosAtuais = lead.getStringSlice('contratos') || []
      for (var m = 0; m < contratosAtuais.length; m++) {
        if (contratosAtuais[m] === contrato.id) {
          log('já vinculado — nada a fazer', { contratoId: contrato.id, leadId: lead.id })
          return
        }
      }

      contratosAtuais.push(contrato.id)
      lead.set('contratos', contratosAtuais)
      app.save(lead)
      log('vínculo automático criado (contrato → lead)', {
        contratoId: contrato.id,
        leadId: lead.id,
        total: contratosAtuais.length,
      })
    } catch (err) {
      // Segurança transacional: o cadastro do contrato é prioritário —
      // erro na automação nunca propaga para o salvamento.
      log(
        'ERRO (ignorado, salvamento não é afetado): ' + (err && err.message ? err.message : err),
        {
          contratoId: contrato ? contrato.id : '',
        },
      )
    }
  }

  e.next()
  vincularContratoAoLead(e.app, e.record)
}, 'contratos_fechados')

// -------------------------------------------------------------
// 2) CONTRATO EDITADO COM TELEFONE ALTERADO → re-tenta (idempotente,
//    sem remover vínculos existentes). PÓS-SAVE também.
// -------------------------------------------------------------
onRecordUpdate((e) => {
  function normalizeDigits(value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }

  function log(msg, ctx) {
    var parts = ['[VINCULO_AUX_ACIDENTE] ' + msg]
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

  function vincularContratoAoLead(app, contrato) {
    try {
      var telDigits = normalizeDigits(contrato.getString('fone'))
      if (!telDigits) {
        log('skip telefone vazio (update)', { contratoId: contrato.id })
        return
      }

      var beneficio = (contrato.getString('beneficio') || '').trim()
      if (beneficio !== 'Aux. Acidente') {
        log('contrato fora de Aux. Acidente — nenhum vínculo automático (update)', {
          contratoId: contrato.id,
          beneficio: beneficio,
        })
        return
      }

      var leads = app.findRecordsByFilter(
        'leads_aux_acidente',
        "telefone ~ '" + telDigits + "'",
        'created',
        0,
        0,
      )

      var candidatos = []
      for (var i = 0; i < leads.length; i++) {
        if (normalizeDigits(leads[i].getString('telefone')) === telDigits)
          candidatos.push(leads[i].id)
      }

      if (candidatos.length === 0) {
        log('nenhum lead correspondente (update)', {
          contratoId: contrato.id,
          fone: contrato.getString('fone'),
        })
        return
      }
      if (candidatos.length > 1) {
        log('múltiplos candidatos — nenhum vínculo automático (update)', {
          contratoId: contrato.id,
          fone: contrato.getString('fone'),
          candidatos: candidatos.join(','),
        })
        return
      }

      var lead = app.findRecordById('leads_aux_acidente', candidatos[0])
      var contratosAtuais = lead.getStringSlice('contratos') || []
      for (var m = 0; m < contratosAtuais.length; m++) {
        if (contratosAtuais[m] === contrato.id) {
          log('já vinculado — nada a fazer (update)', {
            contratoId: contrato.id,
            leadId: lead.id,
          })
          return
        }
      }

      contratosAtuais.push(contrato.id)
      lead.set('contratos', contratosAtuais)
      app.save(lead)
      log('vínculo automático criado após correção de telefone (contrato → lead)', {
        contratoId: contrato.id,
        leadId: lead.id,
        total: contratosAtuais.length,
      })
    } catch (err) {
      log(
        'ERRO (ignorado, salvamento não é afetado): ' + (err && err.message ? err.message : err),
        {
          contratoId: contrato ? contrato.id : '',
        },
      )
    }
  }

  var foneAntes = e.record.original().getString('fone')
  e.next()
  if (normalizeDigits(e.record.getString('fone')) === normalizeDigits(foneAntes)) return
  vincularContratoAoLead(e.app, e.record)
}, 'contratos_fechados')

// -------------------------------------------------------------
// 3) LEAD CRIADO DEPOIS DO CONTRATO → busca contratos de Aux. Acidente
//    compatíveis pelo telefone normalizado (bidirecional).
//    PÓS-SAVE: e.next() primeiro (persiste o lead), vínculo depois.
// -------------------------------------------------------------
onRecordCreate((e) => {
  function normalizeDigits(value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }

  function log(msg, ctx) {
    var parts = ['[VINCULO_AUX_ACIDENTE] ' + msg]
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

  function vincularLeadAContratos(app, leadId, telDigits) {
    try {
      if (!telDigits) {
        log('skip telefone vazio (lead)', { leadId: leadId })
        return
      }

      var contratos = app.findRecordsByFilter(
        'contratos_fechados',
        "fone ~ '" + telDigits + "' && beneficio = 'Aux. Acidente'",
        'created',
        0,
        0,
      )

      var candidatos = []
      for (var i = 0; i < contratos.length; i++) {
        if (normalizeDigits(contratos[i].getString('fone')) === telDigits) {
          candidatos.push(contratos[i].id)
        }
      }

      if (candidatos.length === 0) {
        log('nenhum contrato de Aux. Acidente correspondente (lead)', { leadId: leadId })
        return
      }

      // Recarrega o lead FRESCO do banco após a própria persistência.
      var lead = app.findRecordById('leads_aux_acidente', leadId)
      var contratosAtuais = lead.getStringSlice('contratos') || []
      var adicionados = []
      for (var k = 0; k < candidatos.length; k++) {
        var cid = candidatos[k]
        if (contratosAtuais.indexOf(cid) === -1) {
          contratosAtuais.push(cid)
          adicionados.push(cid)
        }
      }

      if (adicionados.length === 0) {
        log('já vinculado — nada a fazer (lead)', { leadId: leadId })
        return
      }

      // Mesmo telefone = mesma pessoa: acumula todos os contratos de Aux.
      // Acidente ainda não vinculados (nunca substitui; idempotente).
      lead.set('contratos', contratosAtuais)
      app.save(lead)
      log('vínculo automático criado (lead → contratos)', {
        leadId: leadId,
        adicionados: adicionados.join(','),
        total: contratosAtuais.length,
      })
    } catch (err) {
      log('ERRO (ignorado): ' + (err && err.message ? err.message : err), {
        leadId: leadId || '',
      })
    }
  }

  var leadId = e.record.id
  var telDigits = normalizeDigits(e.record.getString('telefone'))
  e.next()
  vincularLeadAContratos(e.app, leadId, telDigits)
}, 'leads_aux_acidente')

// -------------------------------------------------------------
// 4) LEAD EDITADO COM TELEFONE ALTERADO → re-tenta busca de contratos
//    (idempotente; nunca remove vínculos existentes). PÓS-SAVE também.
// -------------------------------------------------------------
onRecordUpdate((e) => {
  function normalizeDigits(value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }

  function log(msg, ctx) {
    var parts = ['[VINCULO_AUX_ACIDENTE] ' + msg]
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

  function vincularLeadAContratos(app, leadId) {
    try {
      // Recarrega o lead FRESCO do banco após a própria persistência.
      var lead = app.findRecordById('leads_aux_acidente', leadId)
      var telDigits = normalizeDigits(lead.getString('telefone'))
      if (!telDigits) {
        log('skip telefone vazio (lead update)', { leadId: leadId })
        return
      }

      var contratos = app.findRecordsByFilter(
        'contratos_fechados',
        "fone ~ '" + telDigits + "' && beneficio = 'Aux. Acidente'",
        'created',
        0,
        0,
      )

      var candidatos = []
      for (var i = 0; i < contratos.length; i++) {
        if (normalizeDigits(contratos[i].getString('fone')) === telDigits) {
          candidatos.push(contratos[i].id)
        }
      }

      if (candidatos.length === 0) {
        log('nenhum contrato de Aux. Acidente correspondente (lead update)', { leadId: leadId })
        return
      }

      var contratosAtuais = lead.getStringSlice('contratos') || []
      var adicionados = []
      for (var k = 0; k < candidatos.length; k++) {
        var cid = candidatos[k]
        if (contratosAtuais.indexOf(cid) === -1) {
          contratosAtuais.push(cid)
          adicionados.push(cid)
        }
      }

      if (adicionados.length === 0) {
        log('já vinculado — nada a fazer (lead update)', { leadId: leadId })
        return
      }

      lead.set('contratos', contratosAtuais)
      app.save(lead)
      log('vínculo automático criado após correção de telefone (lead → contratos)', {
        leadId: leadId,
        adicionados: adicionados.join(','),
        total: contratosAtuais.length,
      })
    } catch (err) {
      log('ERRO (ignorado): ' + (err && err.message ? err.message : err), {
        leadId: leadId || '',
      })
    }
  }

  var leadId = e.record.id
  var telefoneAntes = e.record.original().getString('telefone')
  e.next()
  if (normalizeDigits(e.record.getString('telefone')) === normalizeDigits(telefoneAntes)) return
  vincularLeadAContratos(e.app, leadId)
}, 'leads_aux_acidente')
