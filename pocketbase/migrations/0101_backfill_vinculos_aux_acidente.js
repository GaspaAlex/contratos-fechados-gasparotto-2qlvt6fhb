// pocketbase/migrations/0101_backfill_vinculos_aux_acidente.js
//
// Backfill ÚNICO e IDEMPOTENTE dos vínculos automáticos já existentes entre
// `contratos_fechados` e `leads_aux_acidente`, aplicando a MESMA regra do hook
// `leads_aux_acidente_vinculo.js`:
//   - Reconhecer Aux. Acidente: EXCLUSIVAMENTE beneficio === "Aux. Acidente"
//     (campanha_origem NÃO é confiável — BPC/LOAS e Aux. Doença carregam a
//     campanha "Aux. Acidente META").
//   - Matching por TELEFONE normalizado apenas pelos DÍGITOS.
//   - EXATAMENTE 1 lead com o mesmo telefone → vincula. 0 → nada.
//     Mais de 1 → NÃO escolhe automaticamente (log no backend).
//   - Idempotente: não adiciona contrato já presente em lead.contratos.
//   - Múltiplos contratos do mesmo telefone → acrescenta (nunca substitui).
//   - NÃO altera contratos_fechados, nem status_funil, nem motivo/datas.
//
// ⚠ RUNTIME JSVM: tudo encapsulado dentro da função de migração.
migrate(
  (app) => {
    var normalizeDigits = function (value) {
      return ('' + (value || '')).replace(/\D/g, '')
    }

    var log = function (msg, ctx) {
      var parts = ['[VINCULO_BACKFILL] ' + msg]
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

    var leads = app.findRecordsByFilter('leads_aux_acidente', '', '-created', 0, 0)
    log('início — leads carregados: ' + leads.length)

    var contratos = app.findRecordsByFilter(
      'contratos_fechados',
      "beneficio = 'Aux. Acidente'",
      'created',
      0,
      0,
    )
    log('contratos de Aux. Acidente carregados: ' + contratos.length)

    var vinculosCriados = 0
    var jaVinculados = 0
    var semCandidato = 0
    var multiplosLeads = 0

    for (var i = 0; i < leads.length; i++) {
      var lead = leads[i]
      var leadDigits = normalizeDigits(lead.getString('telefone'))
      if (!leadDigits) {
        log('lead sem telefone válido — pulado', { leadId: lead.id })
        continue
      }

      // 1) Proteção de duplicidade: quantos leads já apontam para este contrato?
      var contratosAtuais = lead.getStringSlice('contratos') || []

      // 2) Contratos de Aux. Acidente com o mesmo telefone normalizado
      var candidatos = []
      for (var j = 0; j < contratos.length; j++) {
        var c = contratos[j]
        if (normalizeDigits(c.getString('fone')) === leadDigits) {
          candidatos.push(c.id)
        }
      }

      if (candidatos.length === 0) {
        semCandidato++
        continue
      }

      // 3) EXATAMENTE 1 lead por telefone: se este telefone tem mais de um lead,
      //    não escolher automaticamente (a menos que já haja vínculo salvo).
      var leadsMesmoTelefone = 0
      for (var k = 0; k < leads.length; k++) {
        if (normalizeDigits(leads[k].getString('telefone')) === leadDigits) leadsMesmoTelefone++
      }
      if (leadsMesmoTelefone > 1) {
        multiplosLeads++
        log('múltiplos leads com o mesmo telefone — não vinculou automaticamente', {
          leadId: lead.id,
          fone: lead.getString('telefone'),
        })
        continue
      }

      var aAdicionar = []
      for (var m = 0; m < candidatos.length; m++) {
        if (contratosAtuais.indexOf(candidatos[m]) === -1) aAdicionar.push(candidatos[m])
      }
      if (aAdicionar.length === 0) {
        jaVinculados++
        continue
      }

      lead.set('contratos', contratosAtuais.concat(aAdicionar))
      try {
        app.save(lead)
        vinculosCriados += aAdicionar.length
        log('vínculos criados para o lead', {
          leadId: lead.id,
          adicionados: aAdicionar.join(','),
        })
      } catch (err) {
        log('ERRO ao salvar lead (ignorado): ' + err.message, { leadId: lead.id })
      }
    }

    log(
      'fim — criados: ' +
        vinculosCriados +
        ', já vinculados: ' +
        jaVinculados +
        ', sem candidato: ' +
        semCandidato +
        ', múltiplos leads (pulados): ' +
        multiplosLeads,
    )
  },
  (app) => {
    // Rollback intencionalmente vazio: este backfill é um no-op reversível
    // (remover vínculos automáticos destruiria dados criados pela automação).
  },
)
