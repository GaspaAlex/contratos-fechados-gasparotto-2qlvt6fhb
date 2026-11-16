/**
 * Central Auxílio-Acidente — DESQUALIFICAÇÃO AUTOMÁTICA por status invalidante
 * de Contratos Fechados (Item 17, ajuste final).
 *
 * REGRA: alguns status representam fatos que, se conhecidos desde o início,
 * teriam impedido a qualificação do lead. Quando um contrato relacionado tem
 * um status INVALIDANTE e o lead NÃO tem nenhum outro contrato válido, o lead
 * é desqualificado automaticamente:
 *
 *   "Litispendência"             → motivo_desqualificacao = 'litispendencia'
 *   "Sem Qualidade de Segurado"  → motivo_desqualificacao = 'sem_qualidade'
 *   "Tem Advogado"               → motivo_desqualificacao = 'possui_advogado'
 *
 * "Arquivar" NÃO desqualifica (nunca se presume a razão da perda): só deixa
 * de contar nos indicadores (via isArchived de src/lib/archivedStatuses.ts).
 *
 * MÚLTIPLOS CONTRATOS: antes de desqualificar, avalia TODOS os contratos da
 * relation. Basta 1 contrato válido (beneficio === 'Aux. Acidente' +
 * !isArchived + status não invalidante) para o lead NÃO ser desqualificado —
 * e, nesse caso, a regra de promoção existente se aplica (contrato prevalece).
 *
 * PRIORIDADE DETERMINÍSTICA entre invalidantes (quando houver mais de um):
 *   1. Litispendência → 2. Tem Advogado → 3. Sem Qualidade de Segurado
 *   (documentada também em INVALIDATING_STATUSES no frontend).
 *
 * Ao desqualificar:
 *   - status_funil = 'desqualificado';
 *   - motivo_desqualificacao = valor correspondente;
 *   - motivo_desqualificacao_outro = '' (vazio);
 *   - desqualificado_em = agora SOMENTE se estiver vazio;
 *   - qualificado_em NUNCA é apagado nem sobrescrito (evento histórico).
 *
 * Contrato voltando a ser válido (ex.: Litispendência → Concluído): aplica a
 * promoção já existente — status_funil = 'qualificado', motivo limpo,
 * qualificado_em preenchido somente se vazio. NADA de restauração cega do
 * "status anterior": o comportamento é sempre derivado da causa REAL atual
 * dos contratos.
 *
 * EXCLUSÃO SIMPLES de contrato não desqualifica sozinha (pode ser erro de
 * cadastro): IDs órfãos na relation não contam como válidos nem invalidantes;
 * a regra só reage a contratos que ainda existem. A relation nunca é alterada
 * aqui (é histórico).
 *
 * ORDEM DE EXECUÇÃO: usa onRecordAfterCreateSuccess / onRecordAfterUpdateSuccess
 * (PÓS-persistência, fora da cadeia onRecordCreate/Update) para rodar DEPOIS do
 * hook de vínculo (leads_aux_acidente_vinculo.js), que pode ter acabado de
 * promover o lead — evita o ping-pong desqualificar→promover no mesmo evento.
 * (O JSVM do PocketBase executa callbacks em pool separado: todo o código,
 * inclusive helpers, vive DENTRO de cada callback.)
 *
 * IDEMPOTÊNCIA: um lead já desqualificado com o MESMO motivo não é re-salvo;
 * gravações repetidas do mesmo estado são filtradas antes do app.save.
 */

// Contrato CRIADO: após a persistência (e após o hook de vínculo rodar).
onRecordAfterCreateSuccess((e) => {
  e.next()

  // Valores do select `status` reais da collection contratos_fechados
  // (confirmados na base viva em 2026-11-16; status é campo texto — comparação
  // exata, sem trim/acentos, espelha os valores gravados pela UI).
  var INVALIDATING_STATUS_TO_MOTIVO = {
    Litispendência: 'litispendencia',
    'Sem Qualidade de Segurado': 'sem_qualidade',
    'Tem Advogado': 'possui_advogado',
  }
  var BENEFICIO_AUX_ACIDENTE = 'Aux. Acidente'

  function normalizeDigits(value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }

  function log(msg, ctx) {
    var parts = ['[INVALIDACAO_AUX_ACIDENTE] ' + msg]
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

  // Contrato válido para conversão = Aux. Acidente + status fora de
  // {Arquivar, Litispendência, Sem Qualidade de Segurado, Tem Advogado}.
  // Espelha isArchived + isContratoInvalidante do frontend.
  function isValido(status, beneficio) {
    if ((beneficio || '') !== BENEFICIO_AUX_ACIDENTE) return false
    if (status === 'Arquivar') return false
    if (INVALIDATING_STATUS_TO_MOTIVO[status] !== undefined) return false
    return true
  }

  /**
   * Reavalia o lead após mudança/vínculo de contrato. Idempotente: só grava
   * quando o estado alvo difere do atual.
   * @returns {boolean} true quando o lead foi alterado (e salvo).
   */
  function reavaliarLead(app, leadId, contexto) {
    var lead
    try {
      lead = app.findRecordById('leads_aux_acidente', leadId)
    } catch (err) {
      log('lead não encontrado (excluído?) — nada a fazer', { leadId: leadId })
      return false
    }

    var relationIds = lead.getStringSlice('contratos') || []

    // Estado REAL atual: resolve todos os contratos da relation.
    // Órfãos (excluídos) não contam como válidos nem invalidantes.
    var temValido = false
    var invalidantes = [] // motivos, para prioridade determinística
    var statusInvalidantes = []
    for (var i = 0; i < relationIds.length; i++) {
      var c
      try {
        c = app.findRecordById('contratos_fechados', relationIds[i])
      } catch (err) {
        continue // órfão — ignora
      }
      var status = c.getString('status') || ''
      var beneficio = c.getString('beneficio') || ''
      if (isValido(status, beneficio)) {
        temValido = true
        break // 1 válido basta — lead não desqualifica
      }
      if (INVALIDATING_STATUS_TO_MOTIVO[status] !== undefined) {
        invalidantes.push(INVALIDATING_STATUS_TO_MOTIVO[status])
        statusInvalidantes.push(status)
      }
      // 'Arquivar' (ou outro status não-válido): apenas não-contabilizado.
    }

    var statusAtual = (lead.getString('status_funil') || '').trim()

    if (temValido) {
      // Contrato prevalece → promoção (regra existente). Nunca sobrescreve
      // qualificado_em; motivo só é limpo se o lead estava desqualificado.
      if (statusAtual === 'qualificado') return false // já qualificado — nada a fazer
      if (statusAtual !== 'qualificando' && statusAtual !== 'desqualificado') {
        log('status_funil inesperado — nenhuma promoção', {
          leadId: leadId,
          status_funil: statusAtual,
        })
        return false
      }
      lead.set('status_funil', 'qualificado')
      if (statusAtual === 'desqualificado') {
        lead.set('motivo_desqualificacao', '')
        lead.set('motivo_desqualificacao_outro', '')
      }
      if (!lead.getString('qualificado_em')) {
        lead.set('qualificado_em', new Date().toISOString())
      }
      app.save(lead)
      log('lead promovido para qualificado (contrato voltou a ser válido)', {
        leadId: leadId,
        origem: contexto,
      })
      return true
    }

    // Nenhum contrato válido. Desqualifica SOMENTE se houver contrato
    // invalidante real ainda relacionado (Arquivar sozinho NÃO desqualifica).
    if (invalidantes.length === 0) {
      return false
    }

    // Prioridade determinística: 1. litispendencia, 2. possui_advogado, 3. sem_qualidade
    var PRIORIDADE = { litispendencia: 1, possui_advogado: 2, sem_qualidade: 3 }
    var motivoEscolhido = invalidantes[0]
    for (var j = 1; j < invalidantes.length; j++) {
      if (PRIORIDADE[invalidantes[j]] < PRIORIDADE[motivoEscolhido])
        motivoEscolhido = invalidantes[j]
    }

    if (
      statusAtual === 'desqualificado' &&
      lead.getString('motivo_desqualificacao') === motivoEscolhido
    ) {
      return false // já está nesse estado — idempotente, não grava de novo
    }

    var antes = statusAtual + '/' + (lead.getString('motivo_desqualificacao') || '')
    lead.set('status_funil', 'desqualificado')
    lead.set('motivo_desqualificacao', motivoEscolhido)
    lead.set('motivo_desqualificacao_outro', '')
    if (!lead.getString('desqualificado_em')) {
      lead.set('desqualificado_em', new Date().toISOString())
    }
    // qualificado_em NUNCA é tocado aqui (evento histórico/auditoria).
    app.save(lead)
    log('lead desqualificado automaticamente por contrato invalidante', {
      leadId: leadId,
      motivo: motivoEscolhido,
      status_invalidantes: statusInvalidantes.join(' | '),
      antes: antes,
      origem: contexto,
    })
    return true
  }

  /**
   * Deriva os leads afetados por um contrato (relation do lado do lead) e
   * reavalia cada um. Proteção contra múltiplos candidatos: processa todos os
   * leads encontrados (mesmo telefone = mesma pessoa), nunca só o primeiro.
   */
  function reavaliarLeadsDoContrato(app, contrato, contexto) {
    var telDigits = normalizeDigits(contrato.getString('fone'))
    if (!telDigits) {
      log('skip telefone vazio (contrato)', { contratoId: contrato.id })
      return
    }
    var leads
    try {
      leads = app.findRecordsByFilter(
        'leads_aux_acidente',
        "telefone ~ '" + telDigits + "'",
        'created',
        0,
        0,
      )
    } catch (err) {
      log('ERRO ao buscar leads (ignorado): ' + (err && err.message ? err.message : err), {
        contratoId: contrato.id,
      })
      return
    }
    var afetados = 0
    for (var i = 0; i < leads.length; i++) {
      if (normalizeDigits(leads[i].getString('telefone')) !== telDigits) continue
      if (reavaliarLead(app, leads[i].id, contexto)) afetados++
    }
    if (afetados > 0) {
      log('reavaliação concluída', {
        contratoId: contrato.id,
        leads_afetados: afetados,
        origem: contexto,
      })
    }
  }

  try {
    if ((e.record.getString('beneficio') || '') !== BENEFICIO_AUX_ACIDENTE) return
    reavaliarLeadsDoContrato(e.app, e.record, 'create')
  } catch (err) {
    log('ERRO (ignorado): ' + (err && err.message ? err.message : err), { contratoId: e.record.id })
  }
}, 'contratos_fechados')

// Contrato EXCLUÍDO: a EXCLUSÃO SIMPLES nunca desqualifica sozinha (nem cria
// motivo, nem restaura status). Mas se, APÓS a exclusão, ainda existir
// contrato invalidante real e nenhum válido na relation, a regra é aplicada
// com base no que RESTOU (os IDs órfãos saem sozinhos: findRecordById falha e
// é ignorado). Arquivado também não desqualifica — nada acontece se só sobrar
// contrato arquivado ou nada.
onRecordAfterDeleteSuccess((e) => {
  e.next()

  var INVALIDATING_STATUS_TO_MOTIVO = {
    Litispendência: 'litispendencia',
    'Sem Qualidade de Segurado': 'sem_qualidade',
    'Tem Advogado': 'possui_advogado',
  }
  var BENEFICIO_AUX_ACIDENTE = 'Aux. Acidente'

  function normalizeDigits(value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }

  function log(msg, ctx) {
    var parts = ['[INVALIDACAO_AUX_ACIDENTE] ' + msg]
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

  function isValido(status, beneficio) {
    if ((beneficio || '') !== BENEFICIO_AUX_ACIDENTE) return false
    if (status === 'Arquivar') return false
    if (INVALIDATING_STATUS_TO_MOTIVO[status] !== undefined) return false
    return true
  }

  function reavaliarLead(app, leadId, contexto) {
    var lead
    try {
      lead = app.findRecordById('leads_aux_acidente', leadId)
    } catch (err) {
      log('lead não encontrado (excluído?) — nada a fazer', { leadId: leadId })
      return false
    }

    var relationIds = lead.getStringSlice('contratos') || []

    var temValido = false
    var invalidantes = []
    var statusInvalidantes = []
    for (var i = 0; i < relationIds.length; i++) {
      var c
      try {
        c = app.findRecordById('contratos_fechados', relationIds[i])
      } catch (err) {
        continue // órfão (o excluído) — ignora
      }
      var status = c.getString('status') || ''
      var beneficio = c.getString('beneficio') || ''
      if (isValido(status, beneficio)) {
        temValido = true
        break
      }
      if (INVALIDATING_STATUS_TO_MOTIVO[status] !== undefined) {
        invalidantes.push(INVALIDATING_STATUS_TO_MOTIVO[status])
        statusInvalidantes.push(status)
      }
    }

    var statusAtual = (lead.getString('status_funil') || '').trim()

    if (temValido) {
      if (statusAtual === 'qualificado') return false
      if (statusAtual !== 'qualificando' && statusAtual !== 'desqualificado') {
        log('status_funil inesperado — nenhuma promoção', {
          leadId: leadId,
          status_funil: statusAtual,
        })
        return false
      }
      lead.set('status_funil', 'qualificado')
      if (statusAtual === 'desqualificado') {
        lead.set('motivo_desqualificacao', '')
        lead.set('motivo_desqualificacao_outro', '')
      }
      if (!lead.getString('qualificado_em')) {
        lead.set('qualificado_em', new Date().toISOString())
      }
      app.save(lead)
      log('lead promovido para qualificado (contrato restante é válido)', {
        leadId: leadId,
        origem: contexto,
      })
      return true
    }

    if (invalidantes.length === 0) {
      return false
    }

    var PRIORIDADE = { litispendencia: 1, possui_advogado: 2, sem_qualidade: 3 }
    var motivoEscolhido = invalidantes[0]
    for (var j = 1; j < invalidantes.length; j++) {
      if (PRIORIDADE[invalidantes[j]] < PRIORIDADE[motivoEscolhido])
        motivoEscolhido = invalidantes[j]
    }

    if (
      statusAtual === 'desqualificado' &&
      lead.getString('motivo_desqualificacao') === motivoEscolhido
    ) {
      return false
    }

    var antes = statusAtual + '/' + (lead.getString('motivo_desqualificacao') || '')
    lead.set('status_funil', 'desqualificado')
    lead.set('motivo_desqualificacao', motivoEscolhido)
    lead.set('motivo_desqualificacao_outro', '')
    if (!lead.getString('desqualificado_em')) {
      lead.set('desqualificado_em', new Date().toISOString())
    }
    app.save(lead)
    log('lead desqualificado por contrato invalidante restante (após exclusão)', {
      leadId: leadId,
      motivo: motivoEscolhido,
      status_invalidantes: statusInvalidantes.join(' | '),
      antes: antes,
      origem: contexto,
    })
    return true
  }

  function reavaliarLeadsDoContrato(app, contrato, contexto) {
    var telDigits = normalizeDigits(contrato.getString('fone'))
    if (!telDigits) {
      log('skip telefone vazio (contrato excluído)', { contratoId: contrato.id })
      return
    }
    var leads
    try {
      leads = app.findRecordsByFilter(
        'leads_aux_acidente',
        "telefone ~ '" + telDigits + "'",
        'created',
        0,
        0,
      )
    } catch (err) {
      log('ERRO ao buscar leads (ignorado): ' + (err && err.message ? err.message : err), {
        contratoId: contrato.id,
      })
      return
    }
    var afetados = 0
    for (var i = 0; i < leads.length; i++) {
      if (normalizeDigits(leads[i].getString('telefone')) !== telDigits) continue
      if (reavaliarLead(app, leads[i].id, contexto)) afetados++
    }
    if (afetados > 0) {
      log('reavaliação concluída (exclusão)', {
        contratoId: contrato.id,
        leads_afetados: afetados,
        origem: contexto,
      })
    }
  }

  try {
    if ((e.record.getString('beneficio') || '') !== BENEFICIO_AUX_ACIDENTE) return
    reavaliarLeadsDoContrato(e.app, e.record, 'delete')
  } catch (err) {
    log('ERRO (ignorado): ' + (err && err.message ? err.message : err), { contratoId: e.record.id })
  }
}, 'contratos_fechados')

// Contrato EDITADO: reage a Concluído→Litispendência/Sem Qualidade/Tem Advogado
// (desqualifica) e ao inverso (re-promove) em realtime — sem depender da
// Central estar aberta.
onRecordAfterUpdateSuccess((e) => {
  e.next()

  var INVALIDATING_STATUS_TO_MOTIVO = {
    Litispendência: 'litispendencia',
    'Sem Qualidade de Segurado': 'sem_qualidade',
    'Tem Advogado': 'possui_advogado',
  }
  var BENEFICIO_AUX_ACIDENTE = 'Aux. Acidente'

  function normalizeDigits(value) {
    return ('' + (value || '')).replace(/\D/g, '')
  }

  function log(msg, ctx) {
    var parts = ['[INVALIDACAO_AUX_ACIDENTE] ' + msg]
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

  function isValido(status, beneficio) {
    if ((beneficio || '') !== BENEFICIO_AUX_ACIDENTE) return false
    if (status === 'Arquivar') return false
    if (INVALIDATING_STATUS_TO_MOTIVO[status] !== undefined) return false
    return true
  }

  function reavaliarLead(app, leadId, contexto) {
    var lead
    try {
      lead = app.findRecordById('leads_aux_acidente', leadId)
    } catch (err) {
      log('lead não encontrado (excluído?) — nada a fazer', { leadId: leadId })
      return false
    }

    var relationIds = lead.getStringSlice('contratos') || []

    var temValido = false
    var invalidantes = []
    var statusInvalidantes = []
    for (var i = 0; i < relationIds.length; i++) {
      var c
      try {
        c = app.findRecordById('contratos_fechados', relationIds[i])
      } catch (err) {
        continue // órfão — ignora
      }
      var status = c.getString('status') || ''
      var beneficio = c.getString('beneficio') || ''
      if (isValido(status, beneficio)) {
        temValido = true
        break
      }
      if (INVALIDATING_STATUS_TO_MOTIVO[status] !== undefined) {
        invalidantes.push(INVALIDATING_STATUS_TO_MOTIVO[status])
        statusInvalidantes.push(status)
      }
    }

    var statusAtual = (lead.getString('status_funil') || '').trim()

    if (temValido) {
      if (statusAtual === 'qualificado') return false
      if (statusAtual !== 'qualificando' && statusAtual !== 'desqualificado') {
        log('status_funil inesperado — nenhuma promoção', {
          leadId: leadId,
          status_funil: statusAtual,
        })
        return false
      }
      lead.set('status_funil', 'qualificado')
      if (statusAtual === 'desqualificado') {
        lead.set('motivo_desqualificacao', '')
        lead.set('motivo_desqualificacao_outro', '')
      }
      if (!lead.getString('qualificado_em')) {
        lead.set('qualificado_em', new Date().toISOString())
      }
      app.save(lead)
      log('lead promovido para qualificado (contrato voltou a ser válido)', {
        leadId: leadId,
        origem: contexto,
      })
      return true
    }

    if (invalidantes.length === 0) {
      return false
    }

    var PRIORIDADE = { litispendencia: 1, possui_advogado: 2, sem_qualidade: 3 }
    var motivoEscolhido = invalidantes[0]
    for (var j = 1; j < invalidantes.length; j++) {
      if (PRIORIDADE[invalidantes[j]] < PRIORIDADE[motivoEscolhido])
        motivoEscolhido = invalidantes[j]
    }

    if (
      statusAtual === 'desqualificado' &&
      lead.getString('motivo_desqualificacao') === motivoEscolhido
    ) {
      return false
    }

    var antes = statusAtual + '/' + (lead.getString('motivo_desqualificacao') || '')
    lead.set('status_funil', 'desqualificado')
    lead.set('motivo_desqualificacao', motivoEscolhido)
    lead.set('motivo_desqualificacao_outro', '')
    if (!lead.getString('desqualificado_em')) {
      lead.set('desqualificado_em', new Date().toISOString())
    }
    app.save(lead)
    log('lead desqualificado automaticamente por contrato invalidante', {
      leadId: leadId,
      motivo: motivoEscolhido,
      status_invalidantes: statusInvalidantes.join(' | '),
      antes: antes,
      origem: contexto,
    })
    return true
  }

  function reavaliarLeadsDoContrato(app, contrato, contexto) {
    var telDigits = normalizeDigits(contrato.getString('fone'))
    if (!telDigits) {
      log('skip telefone vazio (contrato)', { contratoId: contrato.id })
      return
    }
    var leads
    try {
      leads = app.findRecordsByFilter(
        'leads_aux_acidente',
        "telefone ~ '" + telDigits + "'",
        'created',
        0,
        0,
      )
    } catch (err) {
      log('ERRO ao buscar leads (ignorado): ' + (err && err.message ? err.message : err), {
        contratoId: contrato.id,
      })
      return
    }
    var afetados = 0
    for (var i = 0; i < leads.length; i++) {
      if (normalizeDigits(leads[i].getString('telefone')) !== telDigits) continue
      if (reavaliarLead(app, leads[i].id, contexto)) afetados++
    }
    if (afetados > 0) {
      log('reavaliação concluída', {
        contratoId: contrato.id,
        leads_afetados: afetados,
        origem: contexto,
      })
    }
  }

  try {
    if ((e.record.getString('beneficio') || '') !== BENEFICIO_AUX_ACIDENTE) return
    var statusAntes = e.record.original().getString('status') || ''
    var statusAgora = e.record.getString('status') || ''
    var beneficioAntes = e.record.original().getString('beneficio') || ''
    var beneficioAgora = e.record.getString('beneficio') || ''
    // Só reage quando status ou benefício mudaram — edição de datas/
    // observações não re-desqualifica nem re-promove (idempotência barata).
    // Reage a TROCA entre invalidantes também (ex.: Litispendência →
    // Sem Qualidade de Segurado muda o motivo), não só a mudança de validade.
    if (statusAntes === statusAgora && beneficioAntes === beneficioAgora) return
    reavaliarLeadsDoContrato(e.app, e.record, 'update')
  } catch (err) {
    log('ERRO (ignorado): ' + (err && err.message ? err.message : err), { contratoId: e.record.id })
  }
}, 'contratos_fechados')
