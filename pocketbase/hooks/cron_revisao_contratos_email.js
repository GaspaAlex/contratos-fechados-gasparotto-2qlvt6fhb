// pocketbase/hooks/cron_revisao_contratos_email.js
// Envio automático diário de e-mails para contratos do módulo "Contratos Fechados"
// que atingirem a data do campo `revisar_em` na data civil atual de America/Sao_Paulo.
//
// REGRAS DO RUNTIME JSVM DO POCKETBASE:
// Todas as funções e variáveis auxiliares DEVEM estar encapsuladas dentro do callback.
// Declarações de nível superior (top-level) causam ReferenceError nos callbacks.

// -------------------------------------------------------------
// AGENDAMENTO CRON DIÁRIO ÀS 08:00 DE BRASÍLIA (11:00 UTC)
// Nome: revisao-contratos-email
// Expressão: "0 11 * * *"
// -------------------------------------------------------------
cronAdd('revisao-contratos-email', '0 11 * * *', () => {
  function pad2(num) {
    return num < 10 ? '0' + num : '' + num
  }

  function getSaoPauloDateInfo() {
    var now = new Date()
    // Offset fixo de Brasília: UTC-3 (3 * 60 * 60 * 1000 ms)
    // O Brasil aboliu o horário de verão pelo Decreto 9.772/2019, mantendo UTC-3 perene.
    var spOffsetMs = -3 * 60 * 60 * 1000
    var spDate = new Date(now.getTime() + spOffsetMs)

    var year = spDate.getUTCFullYear()
    var month = pad2(spDate.getUTCMonth() + 1)
    var day = pad2(spDate.getUTCDate())
    var todayYMD = year + '-' + month + '-' + day

    var nowUtcPB =
      now.getUTCFullYear() +
      '-' +
      pad2(now.getUTCMonth() + 1) +
      '-' +
      pad2(now.getUTCDate()) +
      ' ' +
      pad2(now.getUTCHours()) +
      ':' +
      pad2(now.getUTCMinutes()) +
      ':' +
      pad2(now.getUTCSeconds()) +
      '.000Z'

    return {
      todayYMD: todayYMD,
      nowUtcPB: nowUtcPB,
    }
  }

  function formatBRDate(dateStr) {
    if (!dateStr) return ''
    var civil = ('' + dateStr).trim().split(' ')[0].split('T')[0]
    var parts = civil.split('-')
    if (parts.length !== 3) return civil
    return parts[2] + '/' + parts[1] + '/' + parts[0]
  }

  function toCivilYMD(dateStr) {
    if (!dateStr) return ''
    return ('' + dateStr).trim().split(' ')[0].split('T')[0]
  }

  function isArchivedStatus(status) {
    if (!status) return false
    var s = ('' + status).trim().toLowerCase()
    return (
      s === 'arquivar' ||
      s === 'litispendência' ||
      s === 'litispendencia' ||
      s === 'sem qualidade de segurado' ||
      s === 'tem advogado'
    )
  }

  function buildEmailBody(contrato, civilDate) {
    var lines = ['ATENÇÃO — CONTRATO PARA REVISÃO']

    var nome = contrato.getString('nome') || ''
    lines.push('Cliente: ' + nome)

    var fone = contrato.getString('fone')
    if (fone && fone.trim()) {
      lines.push('Telefone: ' + fone.trim())
    }

    var beneficio = contrato.getString('beneficio')
    if (beneficio && beneficio.trim()) {
      lines.push('Benefício: ' + beneficio.trim())
    }

    var responsavel = contrato.getString('responsavel')
    if (responsavel && responsavel.trim()) {
      lines.push('Responsável: ' + responsavel.trim())
    }

    var status = contrato.getString('status') || ''
    lines.push('Status: ' + status)

    var origem = contrato.getString('origem')
    if (origem && origem.trim()) {
      lines.push('Origem: ' + origem.trim())
    }

    var dcontrato = contrato.getString('dcontrato')
    if (dcontrato && dcontrato.trim()) {
      lines.push('Data do contrato: ' + formatBRDate(dcontrato))
    }

    lines.push('Revisar em: ' + formatBRDate(civilDate))

    var observacoes = contrato.getString('observacoes')
    if (observacoes && observacoes.trim()) {
      lines.push('Pendência / Observações: ' + observacoes.trim())
    }

    lines.push(
      'Mensagem final: Este contrato atingiu a data programada para acompanhamento no Sistema de Gestão da Advocacia Gasparotto.',
    )

    return lines.join('\n')
  }

  function sendEmailViaWeb3Forms(accessKey, clienteNome, messageBody) {
    var recipient = 'comercial@advocaciagasparotto.com.br'
    var subject = 'Revisar contrato hoje — ' + (clienteNome || 'Cliente')

    var payload = {
      access_key: accessKey,
      to: recipient,
      from_name: 'Sistema Advocacia Gasparotto',
      subject: subject,
      message: messageBody,
    }

    var res = $http.send({
      url: 'https://api.web3forms.com/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 30,
    })

    var isSuccess = false
    var responseDetails = ''

    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        var json = res.json
        if (json && json.success === true) {
          isSuccess = true
        } else {
          responseDetails =
            json && json.message ? json.message : 'Resposta Web3Forms com success != true'
        }
      } catch (_) {
        isSuccess = true
      }
    } else {
      responseDetails = 'HTTP ' + res.statusCode + ': ' + (res.raw || '')
    }

    return {
      success: isSuccess,
      error: isSuccess ? null : responseDetails,
    }
  }

  try {
    var dateInfo = getSaoPauloDateInfo()
    var civilHoje = dateInfo.todayYMD
    var nowUtcPB = dateInfo.nowUtcPB

    console.log('[CRON_REVISAO] Início da execução para data civil: ' + civilHoje)

    var accessKey = $os.getenv('WEB3FORMS_ACCESS_KEY')
    if (!accessKey || !accessKey.trim()) {
      console.error(
        '[CRON_REVISAO] ERRO CRÍTICO: Variável de ambiente WEB3FORMS_ACCESS_KEY não configurada ou vazia. Nenhum e-mail será enviado.',
      )
      return
    }

    var contratos = []
    try {
      contratos = $app.findRecordsByFilter(
        'contratos_fechados',
        "revisar_em != null && revisar_em != ''",
        'created',
        0,
        0,
      )
    } catch (err) {
      console.error('[CRON_REVISAO] Erro ao consultar contratos_fechados: ' + err.message)
      return
    }

    var elegiveis = []
    for (var i = 0; i < contratos.length; i++) {
      var c = contratos[i]
      var st = c.getString('status')
      if (isArchivedStatus(st)) {
        continue
      }

      var revDate = c.getString('revisar_em')
      var civil = toCivilYMD(revDate)
      if (civil === civilHoje) {
        elegiveis.push({
          record: c,
          rawRevisarEm: revDate,
          civil: civil,
        })
      }
    }

    console.log(
      '[CRON_REVISAO] Contratos elegíveis para revisão hoje (' +
        civilHoje +
        '): ' +
        elegiveis.length,
    )

    var enviadosCount = 0
    var ignoradosCount = 0
    var errosCount = 0

    var emailsCol = $app.findCollectionByNameOrId('emails_revisao_enviados')

    for (var j = 0; j < elegiveis.length; j++) {
      var item = elegiveis[j]
      var contrato = item.record
      var contratoId = contrato.id
      var clienteNome = contrato.getString('nome') || 'Cliente'
      var revisarEmDate = item.rawRevisarEm

      console.log(
        '[CRON_REVISAO] Processando contrato ID: ' + contratoId + ' — Cliente: ' + clienteNome,
      )

      var registroExistente = null
      try {
        var logs = $app.findRecordsByFilter(
          'emails_revisao_enviados',
          "contrato_id = '" + contratoId + "' && revisar_em = '" + revisarEmDate + "'",
          '-created',
          1,
          0,
        )
        if (logs && logs.length > 0) {
          registroExistente = logs[0]
        }
      } catch (_) {}

      if (registroExistente && registroExistente.getString('status_envio') === 'enviado') {
        console.log(
          '[CRON_REVISAO] Ignorado, já enviado anteriormente: Contrato ID ' +
            contratoId +
            ' (' +
            clienteNome +
            ')',
        )
        ignoradosCount++
        continue
      }

      var registroControle = registroExistente
      if (!registroControle) {
        try {
          var novoReg = new Record(emailsCol)
          novoReg.set('contrato_id', contratoId)
          novoReg.set('revisar_em', revisarEmDate)
          novoReg.set('status_envio', 'pendente')
          novoReg.set('tentativa_em', nowUtcPB)
          $app.save(novoReg)
          registroControle = novoReg
        } catch (saveErr) {
          console.warn(
            '[CRON_REVISAO] Conflito ao criar registro de controle (possível concorrência): ' +
              saveErr.message,
          )
          try {
            var recarregados = $app.findRecordsByFilter(
              'emails_revisao_enviados',
              "contrato_id = '" + contratoId + "' && revisar_em = '" + revisarEmDate + "'",
              '-created',
              1,
              0,
            )
            if (recarregados && recarregados.length > 0) {
              registroControle = recarregados[0]
              if (registroControle.getString('status_envio') === 'enviado') {
                console.log(
                  '[CRON_REVISAO] Ignorado após concorrência (já enviado): Contrato ID ' +
                    contratoId,
                )
                ignoradosCount++
                continue
              }
            }
          } catch (_) {}
        }
      }

      if (!registroControle) {
        console.error(
          '[CRON_REVISAO] Falha ao obter ou criar registro de controle para Contrato ID ' +
            contratoId,
        )
        errosCount++
        continue
      }

      registroControle.set('tentativa_em', nowUtcPB)

      var emailBody = buildEmailBody(contrato, item.civil)
      var sendResult = sendEmailViaWeb3Forms(accessKey, clienteNome, emailBody)

      if (sendResult.success) {
        registroControle.set('status_envio', 'enviado')
        registroControle.set('enviado_em', nowUtcPB)
        registroControle.set('erro', '')
        try {
          $app.save(registroControle)
          enviadosCount++
          console.log(
            '[CRON_REVISAO] Sucesso no envio: Contrato ID ' +
              contratoId +
              ' — Cliente: ' +
              clienteNome,
          )
        } catch (errSave) {
          console.error('[CRON_REVISAO] Erro ao salvar status_envio=enviado: ' + errSave.message)
        }
      } else {
        errosCount++
        var msgErro = sendResult.error || 'Erro desconhecido no Web3Forms'
        console.error(
          '[CRON_REVISAO] Falha no envio Web3Forms para Contrato ID ' +
            contratoId +
            ' (' +
            clienteNome +
            '): ' +
            msgErro,
        )
        registroControle.set('status_envio', 'erro')
        registroControle.set('erro', msgErro)
        try {
          $app.save(registroControle)
        } catch (errSave2) {
          console.error('[CRON_REVISAO] Erro ao salvar status_envio=erro: ' + errSave2.message)
        }
      }
    }

    console.log(
      '[CRON_REVISAO] Fim da execução: ' +
        elegiveis.length +
        ' elegíveis, ' +
        enviadosCount +
        ' enviados com sucesso, ' +
        ignoradosCount +
        ' ignorados (já enviados), ' +
        errosCount +
        ' erros.',
    )
  } catch (err) {
    console.error('[CRON_REVISAO] Exceção geral durante o job cron: ' + err.message)
  }
})

// -------------------------------------------------------------
// ROTA HTTP DE DISPARO MANUAL (SUPERUSER/AUTH APENAS)
// POST /backend/v1/gasparotto/test-revisao-email?data=YYYY-MM-DD
// Permite teste controlado sem depender do horário ou modificar o banco.
// -------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/gasparotto/test-revisao-email',
  (e) => {
    function pad2(num) {
      return num < 10 ? '0' + num : '' + num
    }

    function getSaoPauloDateInfo() {
      var now = new Date()
      var spOffsetMs = -3 * 60 * 60 * 1000
      var spDate = new Date(now.getTime() + spOffsetMs)

      var year = spDate.getUTCFullYear()
      var month = pad2(spDate.getUTCMonth() + 1)
      var day = pad2(spDate.getUTCDate())
      var todayYMD = year + '-' + month + '-' + day

      var nowUtcPB =
        now.getUTCFullYear() +
        '-' +
        pad2(now.getUTCMonth() + 1) +
        '-' +
        pad2(now.getUTCDate()) +
        ' ' +
        pad2(now.getUTCHours()) +
        ':' +
        pad2(now.getUTCMinutes()) +
        ':' +
        pad2(now.getUTCSeconds()) +
        '.000Z'

      return {
        todayYMD: todayYMD,
        nowUtcPB: nowUtcPB,
      }
    }

    function formatBRDate(dateStr) {
      if (!dateStr) return ''
      var civil = ('' + dateStr).trim().split(' ')[0].split('T')[0]
      var parts = civil.split('-')
      if (parts.length !== 3) return civil
      return parts[2] + '/' + parts[1] + '/' + parts[0]
    }

    function toCivilYMD(dateStr) {
      if (!dateStr) return ''
      return ('' + dateStr).trim().split(' ')[0].split('T')[0]
    }

    function isArchivedStatus(status) {
      if (!status) return false
      var s = ('' + status).trim().toLowerCase()
      return (
        s === 'arquivar' ||
        s === 'litispendência' ||
        s === 'litispendencia' ||
        s === 'sem qualidade de segurado' ||
        s === 'tem advogado'
      )
    }

    function buildEmailBody(contrato, civilDate) {
      var lines = ['ATENÇÃO — CONTRATO PARA REVISÃO']

      var nome = contrato.getString('nome') || ''
      lines.push('Cliente: ' + nome)

      var fone = contrato.getString('fone')
      if (fone && fone.trim()) {
        lines.push('Telefone: ' + fone.trim())
      }

      var beneficio = contrato.getString('beneficio')
      if (beneficio && beneficio.trim()) {
        lines.push('Benefício: ' + beneficio.trim())
      }

      var responsavel = contrato.getString('responsavel')
      if (responsavel && responsavel.trim()) {
        lines.push('Responsável: ' + responsavel.trim())
      }

      var status = contrato.getString('status') || ''
      lines.push('Status: ' + status)

      var origem = contrato.getString('origem')
      if (origem && origem.trim()) {
        lines.push('Origem: ' + origem.trim())
      }

      var dcontrato = contrato.getString('dcontrato')
      if (dcontrato && dcontrato.trim()) {
        lines.push('Data do contrato: ' + formatBRDate(dcontrato))
      }

      lines.push('Revisar em: ' + formatBRDate(civilDate))

      var observacoes = contrato.getString('observacoes')
      if (observacoes && observacoes.trim()) {
        lines.push('Pendência / Observações: ' + observacoes.trim())
      }

      lines.push(
        'Mensagem final: Este contrato atingiu a data programada para acompanhamento no Sistema de Gestão da Advocacia Gasparotto.',
      )

      return lines.join('\n')
    }

    function sendEmailViaWeb3Forms(accessKey, clienteNome, messageBody) {
      var recipient = 'comercial@advocaciagasparotto.com.br'
      var subject = 'Revisar contrato hoje — ' + (clienteNome || 'Cliente')

      var payload = {
        access_key: accessKey,
        to: recipient,
        from_name: 'Sistema Advocacia Gasparotto',
        subject: subject,
        message: messageBody,
      }

      var res = $http.send({
        url: 'https://api.web3forms.com/submit',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 30,
      })

      var isSuccess = false
      var responseDetails = ''

      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          var json = res.json
          if (json && json.success === true) {
            isSuccess = true
          } else {
            responseDetails =
              json && json.message ? json.message : 'Resposta Web3Forms com success != true'
          }
        } catch (_) {
          isSuccess = true
        }
      } else {
        responseDetails = 'HTTP ' + res.statusCode + ': ' + (res.raw || '')
      }

      return {
        success: isSuccess,
        error: isSuccess ? null : responseDetails,
      }
    }

    var authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação necessária' })
    }

    var customDate = e.request.url.query().get('data') || ''
    if (customDate && !/^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
      return e.json(400, { error: 'Formato de data inválido. Use YYYY-MM-DD.' })
    }

    var dateInfo = getSaoPauloDateInfo()
    var civilHoje = customDate || dateInfo.todayYMD
    var nowUtcPB = dateInfo.nowUtcPB

    console.log('[TEST_REVISAO] Início da execução para data civil: ' + civilHoje)

    var accessKey = $os.getenv('WEB3FORMS_ACCESS_KEY')
    if (!accessKey || !accessKey.trim()) {
      console.error(
        '[TEST_REVISAO] ERRO CRÍTICO: Variável de ambiente WEB3FORMS_ACCESS_KEY não configurada ou vazia. Nenhum e-mail será enviado.',
      )
      return e.json(400, {
        status: 'error',
        message: 'WEB3FORMS_ACCESS_KEY não configurada ou vazia no ambiente.',
        processados: 0,
      })
    }

    var contratos = []
    try {
      contratos = $app.findRecordsByFilter(
        'contratos_fechados',
        "revisar_em != null && revisar_em != ''",
        'created',
        0,
        0,
      )
    } catch (err) {
      console.error('[TEST_REVISAO] Erro ao consultar contratos_fechados: ' + err.message)
      return e.json(500, {
        status: 'error',
        message: 'Erro ao consultar contratos_fechados: ' + err.message,
      })
    }

    var elegiveis = []
    for (var i = 0; i < contratos.length; i++) {
      var c = contratos[i]
      var st = c.getString('status')
      if (isArchivedStatus(st)) {
        continue
      }

      var revDate = c.getString('revisar_em')
      var civil = toCivilYMD(revDate)
      if (civil === civilHoje) {
        elegiveis.push({
          record: c,
          rawRevisarEm: revDate,
          civil: civil,
        })
      }
    }

    console.log(
      '[TEST_REVISAO] Contratos elegíveis para revisão hoje (' +
        civilHoje +
        '): ' +
        elegiveis.length,
    )

    var enviadosCount = 0
    var ignoradosCount = 0
    var errosCount = 0

    var emailsCol = $app.findCollectionByNameOrId('emails_revisao_enviados')

    for (var j = 0; j < elegiveis.length; j++) {
      var item = elegiveis[j]
      var contrato = item.record
      var contratoId = contrato.id
      var clienteNome = contrato.getString('nome') || 'Cliente'
      var revisarEmDate = item.rawRevisarEm

      console.log(
        '[TEST_REVISAO] Processando contrato ID: ' + contratoId + ' — Cliente: ' + clienteNome,
      )

      var registroExistente = null
      try {
        var logs = $app.findRecordsByFilter(
          'emails_revisao_enviados',
          "contrato_id = '" + contratoId + "' && revisar_em = '" + revisarEmDate + "'",
          '-created',
          1,
          0,
        )
        if (logs && logs.length > 0) {
          registroExistente = logs[0]
        }
      } catch (_) {}

      if (registroExistente && registroExistente.getString('status_envio') === 'enviado') {
        console.log(
          '[TEST_REVISAO] Ignorado, já enviado anteriormente: Contrato ID ' +
            contratoId +
            ' (' +
            clienteNome +
            ')',
        )
        ignoradosCount++
        continue
      }

      var registroControle = registroExistente
      if (!registroControle) {
        try {
          var novoReg = new Record(emailsCol)
          novoReg.set('contrato_id', contratoId)
          novoReg.set('revisar_em', revisarEmDate)
          novoReg.set('status_envio', 'pendente')
          novoReg.set('tentativa_em', nowUtcPB)
          $app.save(novoReg)
          registroControle = novoReg
        } catch (saveErr) {
          console.warn(
            '[TEST_REVISAO] Conflito ao criar registro de controle (concorrência): ' +
              saveErr.message,
          )
          try {
            var recarregados = $app.findRecordsByFilter(
              'emails_revisao_enviados',
              "contrato_id = '" + contratoId + "' && revisar_em = '" + revisarEmDate + "'",
              '-created',
              1,
              0,
            )
            if (recarregados && recarregados.length > 0) {
              registroControle = recarregados[0]
              if (registroControle.getString('status_envio') === 'enviado') {
                console.log(
                  '[TEST_REVISAO] Ignorado após concorrência (já enviado): Contrato ID ' +
                    contratoId,
                )
                ignoradosCount++
                continue
              }
            }
          } catch (_) {}
        }
      }

      if (!registroControle) {
        console.error(
          '[TEST_REVISAO] Falha ao obter ou criar registro de controle para Contrato ID ' +
            contratoId,
        )
        errosCount++
        continue
      }

      registroControle.set('tentativa_em', nowUtcPB)

      var emailBody = buildEmailBody(contrato, item.civil)
      var sendResult = sendEmailViaWeb3Forms(accessKey, clienteNome, emailBody)

      if (sendResult.success) {
        registroControle.set('status_envio', 'enviado')
        registroControle.set('enviado_em', nowUtcPB)
        registroControle.set('erro', '')
        try {
          $app.save(registroControle)
          enviadosCount++
          console.log(
            '[TEST_REVISAO] Sucesso no envio: Contrato ID ' +
              contratoId +
              ' — Cliente: ' +
              clienteNome,
          )
        } catch (errSave) {
          console.error('[TEST_REVISAO] Erro ao salvar status_envio=enviado: ' + errSave.message)
        }
      } else {
        errosCount++
        var msgErro = sendResult.error || 'Erro desconhecido no Web3Forms'
        console.error(
          '[TEST_REVISAO] Falha no envio Web3Forms para Contrato ID ' +
            contratoId +
            ' (' +
            clienteNome +
            '): ' +
            msgErro,
        )
        registroControle.set('status_envio', 'erro')
        registroControle.set('erro', msgErro)
        try {
          $app.save(registroControle)
        } catch (errSave2) {
          console.error('[TEST_REVISAO] Erro ao salvar status_envio=erro: ' + errSave2.message)
        }
      }
    }

    console.log(
      '[TEST_REVISAO] Fim da execução: ' +
        elegiveis.length +
        ' elegíveis, ' +
        enviadosCount +
        ' enviados com sucesso, ' +
        ignoradosCount +
        ' ignorados (já enviados), ' +
        errosCount +
        ' erros.',
    )

    return e.json(200, {
      status: 'ok',
      civilData: civilHoje,
      elegiveis: elegiveis.length,
      enviados: enviadosCount,
      ignorados: ignoradosCount,
      erros: errosCount,
    })
  },
  $apis.requireSuperuserAuth(),
)
