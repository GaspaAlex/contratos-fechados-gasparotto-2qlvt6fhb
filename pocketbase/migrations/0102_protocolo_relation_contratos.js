// pocketbase/migrations/0102_protocolo_relation_contratos.js
//
// INTEGRAÇÃO AUTOMÁTICA PROTOCOLO ↔ CONTRATOS FECHADOS
// =====================================================
// 1) Adiciona o campo relation MÚLTIPLO e OPCIONAL `protocolo.contratos`
//    apontando para `contratos_fechados` (cascadeDelete: false, sem relation
//    inversa em contratos_fechados). Nenhum outro campo é alterado.
// 2) BACKFILL idempotente: aplica a MESMA regra de correspondência do hook
//    `protocolo_vinculo_contrato.js` aos protocolos existentes:
//      - Telefone normalizado apenas pelos DÍGITOS (máscara ignorada).
//      - Benefício semanticamente equivalente: `contratos_fechados.beneficio`
//        (texto) vs `protocolo.tipo_acao` (relation), comparado pelo NOME do
//        tipo de ação (trim + minúsculas).
//      - Cenário 1: exatamente 1 contrato com telefone+benefício → vincula.
//      - Cenário 2: 2+ candidatos → desempate por `dcontrato` (10 primeiros
//        caracteres); se exatamente 1 bater → vincula esse.
//      - Cenário 3: ainda mais de um candidato → NÃO vincula (ambíguo).
//      - Cenário 4: nenhum candidato seguro → relation permanece vazia.
//      - NÃO se usa NOME, responsável nem origem como critério de vínculo.
//      - Protocolo que JÁ possui contratos na relation não é reavaliado
//        (nunca substitui um vínculo existente).
//      - Nenhum outro dado do Protocolo é alterado.
//
// ⚠ RUNTIME JSVM: tudo encapsulado dentro das funções de migração.
migrate(
  (app) => {
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
      var parts = ['[PROTOCOLO_BACKFILL] ' + msg]
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

    // ---- 1) Campo relation (idempotente) ----
    var collection = app.findCollectionByNameOrId('protocolo')
    if (!collection.fields.getByName('contratos')) {
      var contratosCollection = app.findCollectionByNameOrId('contratos_fechados')
      collection.fields.add(
        new Field({
          name: 'contratos',
          type: 'relation',
          required: false,
          hidden: false,
          presentable: false,
          collectionId: contratosCollection.id,
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 99,
        }),
      )
      app.save(collection)
      log('campo relation `contratos` criado em `protocolo`')
    } else {
      log('campo relation `contratos` já existe — nada a fazer')
    }

    // ---- 2) Backfill idempotente ----
    var tipos = app.findRecordsByFilter('tipos_acao', '', '', 0, 0)
    var nomeTipoPorId = {}
    for (var t = 0; t < tipos.length; t++) {
      nomeTipoPorId[tipos[t].id] = tipos[t].getString('nome')
    }

    var contratos = app.findRecordsByFilter('contratos_fechados', '', '', 0, 0)
    var protocolos = app.findRecordsByFilter('protocolo', '', '', 0, 0)
    log('início do backfill', { protocolos: protocolos.length, contratos: contratos.length })

    var vinculados = 0
    var semMatch = 0
    var ambiguos = 0
    var jaComContrato = 0
    var semDados = 0

    for (var p = 0; p < protocolos.length; p++) {
      var protocolo = protocolos[p]
      var atuais = protocolo.getStringSlice('contratos') || []
      if (atuais.length > 0) {
        jaComContrato++
        continue
      }

      var tel = digitos(protocolo.getString('fone'))
      var beneficioProtocolo = nomeTipoPorId[protocolo.getString('tipo_acao')] || ''
      if (!tel || !beneficioProtocolo) {
        semDados++
        continue
      }

      var candidatos = []
      for (var c = 0; c < contratos.length; c++) {
        var contrato = contratos[c]
        if (digitos(contrato.getString('fone')) !== tel) continue
        if (normTexto(contrato.getString('beneficio')) !== normTexto(beneficioProtocolo)) continue
        candidatos.push(contrato)
      }

      var escolhido = null
      if (candidatos.length === 1) {
        escolhido = candidatos[0]
      } else if (candidatos.length > 1) {
        // Cenário 2: desempate por data do contrato — só quando o protocolo tem data.
        var dProto = ymd(protocolo.getString('dcontrato'))
        if (dProto) {
          var porData = []
          for (var d = 0; d < candidatos.length; d++) {
            if (ymd(candidatos[d].getString('dcontrato')) === dProto) porData.push(candidatos[d])
          }
          if (porData.length === 1) escolhido = porData[0]
        }
      }

      if (!escolhido) {
        if (candidatos.length > 1) {
          ambiguos++
          log('múltiplos candidatos — não vinculou automaticamente', {
            protocoloId: protocolo.id,
            fone: protocolo.getString('fone'),
            candidatos: candidatos
              .map(function (x) {
                return x.id
              })
              .join(','),
          })
        } else {
          semMatch++
        }
        continue
      }

      protocolo.set('contratos', [escolhido.id])
      app.save(protocolo)
      vinculados++
      log('vínculo criado no backfill', {
        protocoloId: protocolo.id,
        contratoId: escolhido.id,
      })
    }

    log('backfill concluído', {
      vinculados: vinculados,
      semMatch: semMatch,
      ambiguos: ambiguos,
      jaComContrato: jaComContrato,
      semDados: semDados,
      total: protocolos.length,
    })
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('protocolo')
    if (collection.fields.getByName('contratos')) {
      collection.fields.removeByName('contratos')
      app.save(collection)
    }
  },
)
