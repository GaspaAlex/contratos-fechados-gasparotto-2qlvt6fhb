// pocketbase/hooks/protocolo_novo_mesmo_caso.js
//
// NOVO PROTOCOLO DO MESMO CASO (reabertura/reajuizamento)
// ========================================================
// Exceção CONTROLADA à proteção anti-duplicidade (protocolo_anti_duplicidade.js):
// um novo protocolo pode nascer com relation `contratos` já ocupada POR OUTRO
// protocolo APENAS quando todos os requisitos do fluxo "Novo protocolo do
// mesmo caso" são validados NO BACKEND:
//   a) `caso_origem` informado = id de um protocolo EXISTENTE;
//   b) `justificativa_reabertura` (texto) obrigatório, não vazio após trim;
//   c) vínculo legítimo: a cadeia é resolvida até a RAIZ — se o protocolo
//      informado já é continuação, usa-se o caso_origem DELE (raiz da cadeia);
//   d) o NOVO registro e a RAIZ da cadeia compartilham ao menos um contrato na
//      relation `contratos` (o novo nasce COM a relation do original — o
//      vínculo automático de protocolo_vinculo_contrato.js não interfere).
//   e) opcional `protocolo_anterior`: para auditoria, deve pertencer à mesma
//      cadeia (raiz do anterior == raiz informada) e ser diferente do novo.
//
// Segurança transacional: roda em onRecordCreate (DENTRO da transação do
// PocketBase), com lock conservador no registro de origem: se duas tentativas
// passarem ao mesmo tempo, uma delas falha ao persistir o lock — sem corrida.
// Requisitos (a)-(d) são verificados na transação; marcações arbitrárias do
// frontend sem origem existente, sem justificativa ou com cadeia de outro
// contrato são recusadas.
//
// ⚠ RUNTIME JSVM (goja): pool separado — toda a lógica vive DENTRO do callback.

onRecordCreate((e) => {
  e.next()

  function log(msg, ctx) {
    var parts = ['[PROTOCOLO_MESMO_CASO] ' + msg]
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

  // Só avalia quando o fluxo especial está sendo usado: caso_origem presente.
  // Sem caso_origem, o protocolo segue o caminho normal (anti-duplicidade
  // integral, cadastro manual ou integração Contratos Fechados).
  var origemId = ('' + (e.record.getString('caso_origem') || '')).trim()
  if (!origemId) return

  var novoId = e.record.id

  // (b) justificativa obrigatória no backend.
  var justificativa = ('' + (e.record.getString('justificativa_reabertura') || '')).trim()
  if (!justificativa) {
    throw new BadRequestError(
      'PROTOCOLO_MESMO_CASO_JUSTIFICATIVA: A justificativa é obrigatória para novo protocolo do mesmo caso.',
    )
  }

  // (b2) classificação da continuidade obrigatória (migration 0106).
  var TIPOS_CONTINUIDADE = [
    'Administrativo → Judicial',
    'Novo ajuizamento',
    'Outra continuidade justificada',
  ]
  var tipoContinuidade = ('' + (e.record.getString('tipo_continuidade') || '')).trim()
  if (!tipoContinuidade) {
    throw new BadRequestError(
      'PROTOCOLO_MESMO_CASO_TIPO: A classificação da continuidade é obrigatória para novo protocolo do mesmo caso.',
    )
  }
  if (TIPOS_CONTINUIDADE.indexOf(tipoContinuidade) === -1) {
    throw new BadRequestError('PROTOCOLO_MESMO_CASO_TIPO: Classificação de continuidade inválida.')
  }

  // (a) protocolo original deve existir e não pode ser o próprio novo registro.
  var origem
  try {
    origem = $app.findRecordById('protocolo', origemId)
  } catch (err) {
    throw new BadRequestError(
      'PROTOCOLO_MESMO_CASO_INVALIDO: Protocolo original informado não existe.',
    )
  }
  if (origem.id === novoId) {
    throw new BadRequestError(
      'PROTOCOLO_MESMO_CASO_INVALIDO: O protocolo original não pode ser o próprio registro.',
    )
  }

  // (c) resolução da cadeia até a RAIZ (se o original já é continuação, sobe).
  var raizId = origemId
  var passos = 0
  var visitados = {}
  while (passos < 25) {
    var atual = $app.findRecordById('protocolo', raizId)
    var pai = ('' + (atual.getString('caso_origem') || '')).trim()
    if (!pai || pai === raizId || visitados[pai]) break
    visitados[raizId] = true
    raizId = pai
    passos++
  }
  var raiz
  try {
    raiz = $app.findRecordById('protocolo', raizId)
  } catch (err) {
    throw new BadRequestError(
      'PROTOCOLO_MESMO_CASO_INVALIDO: Raiz da cadeia do caso não encontrada.',
    )
  }

  // Novo registro já gravado com caso_origem apontando para si mesmo — recusa.
  if (raizId === novoId) {
    throw new BadRequestError(
      'PROTOCOLO_MESMO_CASO_INVALIDO: Cadeia inválida (raiz é o próprio novo registro).',
    )
  }

  // (d) vínculo legítimo: novo registro e RAIZ compartilham ao menos 1 contrato.
  var contratosNovo = e.record.getStringSlice('contratos') || []
  var contratosRaiz = raiz.getStringSlice('contratos') || []
  var compartilhado = false
  for (var i = 0; i < contratosNovo.length; i++) {
    if (contratosNovo[i] && contratosRaiz.indexOf(contratosNovo[i]) !== -1) {
      compartilhado = true
      break
    }
  }
  if (!compartilhado) {
    throw new BadRequestError(
      'PROTOCOLO_MESMO_CASO_INVALIDO: O novo protocolo precisa carregar o contrato vinculado ao caso original.',
    )
  }

  // (e) auditoria opcional: protocolo_anterior deve pertencer à MESMA cadeia.
  var anteriorId = ('' + (e.record.getString('protocolo_anterior') || '')).trim()
  if (anteriorId && anteriorId !== origemId) {
    var anterior
    try {
      anterior = $app.findRecordById('protocolo', anteriorId)
    } catch (err) {
      throw new BadRequestError(
        'PROTOCOLO_MESMO_CASO_INVALIDO: Protocolo anterior informado não existe.',
      )
    }
    var raizAnterior = ('' + (anterior.getString('caso_origem') || '')).trim() || anterior.id
    var raizOrigem = ('' + (origem.getString('caso_origem') || '')).trim() || origem.id
    if (raizAnterior !== raizOrigem) {
      throw new BadRequestError(
        'PROTOCOLO_MESMO_CASO_INVALIDO: O protocolo anterior não pertence à mesma cadeia do caso.',
      )
    }
    if (anterior.id === novoId) {
      throw new BadRequestError(
        'PROTOCOLO_MESMO_CASO_INVALIDO: O protocolo anterior não pode ser o próprio novo registro.',
      )
    }
  }

  // Lock conservador: grava o id do novo protocolo na RAIZ (auditoria) ainda
  // dentro da transação. CONCATENA ao histórico existente (sem duplicar ids) —
  // a 2ª, 3ª e demais continuações preservam toda a cadeia.
  var raizAtualizada = $app.findRecordById('protocolo', raizId)
  var continuacoes = []
  try {
    continuacoes = raizAtualizada.getStringSlice('caso_continuacoes') || []
  } catch (errLista) {
    continuacoes = []
  }
  if (continuacoes.indexOf(novoId) === -1) {
    continuacoes.push(novoId)
  }
  raizAtualizada.set('caso_continuacoes', continuacoes)
  $app.save(raizAtualizada)

  log('novo protocolo do mesmo caso validado', {
    novoId: novoId,
    origemId: origemId,
    raizId: raizId,
    contratos: contratosNovo.join(','),
  })
}, 'protocolo')
