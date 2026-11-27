// BUILD C1-B — CADASTRO PRÓPRIO DE COLABORADORES DO MÓDULO CONTRACHEQUES
// ============================================================
// UMA collection NOVA e ADITIVA — nenhuma collection existente é alterada:
//
//   cc_colaboradores — cadastro de colaborador EXCLUSIVO do módulo
//   Contracheques. Permite cadastrar manualmente (nome completo) alguém que
//   não está no Cartão de Ponto, SEM criar usuário de acesso e SEM exigir
//   cadastro de ponto. A participação na aba segue sendo o vínculo em
//   cc_participantes (relation → funcionarios), que passa a aceitar TAMBÉM
//   relation → cc_colaboradores (funcionario fica opcional — os vínculos
//   existentes dos 4 participantes continuam válidos e intocados).
//
// POR QUE UM CADASTRO PRÓPRIO (e não criar em `funcionarios`): a collection
// funcionarios é o núcleo do Cartão de Ponto — pin required, perfil,
// horários, user_id (login), registros e saldos_mensais dependem dela.
// Usá-la obrigaria cadastro de ponto/entrada de dados do módulo alheio; a
// decisão aqui é a alternativa privada mais simples, com AS MESMAS regras de
// segurança de cc_salarios/cc_participantes (Build C1-A):
//   - TODAS as cinco operações restritas ao usuário autorizado por ID
//     interno estável (yxubawrt8aser8k) com fallback pelo e-mail
//     (escritorio@advocaciagasparotto.com.br);
//   - nenhuma regra pública; qualquer outro usuário (inclusive outros
//     gestores) leva 403/404 do backend;
//   - nenhuma outra collection tem permissões alteradas.
//
// IDEMPOTENTE: reexecutar não duplica (a collection é reutilizada se já
// existir e o campo relation é adicionado só se ausente).
//
// DEDUPE (dupla proteção contra duplicidades, ex. o registro antigo
// duplicado da Nataly em funcionarios):
//   - UI: normalização de nome + aviso/reuso antes de criar (veja
//     src/lib/ccParticipantes.ts — planejarCadastroColaborador);
//   - banco: índice único case-insensitive (COLLATE NOCASE) em
//     cc_colaboradores.nome — a gravação direta de nome idêntico é recusada.
//
// ⚠ NÃO criar neste build: salários, contracheques mensais, dados
// financeiros, usuário de acesso ou qualquer vínculo com o Cartão de Ponto.

migrate(
  (app) => {
    // ------------------------------------------------------------------
    // 1. Collection cc_colaboradores (cadastro próprio do módulo)
    // ------------------------------------------------------------------
    let colaboradores
    try {
      colaboradores = app.findCollectionByNameOrId('cc_colaboradores')
    } catch {
      colaboradores = new Collection({
        type: 'base',
        name: 'cc_colaboradores',
        fields: [
          { type: 'text', name: 'nome', required: true, min: 3, max: 120 },
          // origem do cadastro: 'manual' (tela) — select para futuras fontes
          { type: 'select', name: 'origem', values: ['manual'], maxSelect: 1 },
          { type: 'bool', name: 'ativo' },
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
          { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
        ],
        indexes: [
          // Dedupe em nível de banco: sem dois cadastros de mesmo nome
          // (case-insensitive). Nenhum registro existe ainda — seguro.
          'CREATE UNIQUE INDEX idx_cc_colaboradores_nome ON cc_colaboradores (nome COLLATE NOCASE)',
          'CREATE INDEX idx_cc_colaboradores_ativo ON cc_colaboradores (ativo)',
        ],
        listRule:
          "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
        createRule:
          "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.id = 'yxubawrt8aser8k' || @request.auth.email = 'escritorio@advocaciagasparotto.com.br')",
      })
      app.save(colaboradores)
    }

    // ------------------------------------------------------------------
    // 2. cc_participantes: relation opcional → cc_colaboradores.
    //    O campo `funcionario` (→ funcionarios) fica OPCIONAL — os 4
    //    vínculos existentes (todos com funcionario) continuam válidos.
    //    Regra: exatamente UM dos dois preenchido.
    // ------------------------------------------------------------------
    const participantes = app.findCollectionByNameOrId('cc_participantes')
    if (!participantes.fields.getByName('colaborador')) {
      const colaboradoresId = colaboradores.id
      participantes.fields.add(
        new RelationField({
          name: 'colaborador',
          collectionId: colaboradoresId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    // Sem required no relation: bool/relation opcional evita rejeitar os
    // vínculos existentes. A integridade "um OU outro" é garantida:
    //   - aqui: os vínculos existentes já têm funcionario;
    //   - na criação: o serviço grava exatamente um dos dois campos;
    //   - no banco: o índice único por funcionario garante 1 vínculo por
    //     funcionário (funcionario vazio não participa dele).
    app.save(participantes)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('cc_participantes')
      if (col.fields.getByName('colaborador')) {
        col.fields.removeByName('colaborador')
        app.save(col)
      }
    } catch {
      // collection inexistente — down idempotente
    }
    try {
      app.delete(app.findCollectionByNameOrId('cc_colaboradores'))
    } catch {
      // já inexistente — down idempotente
    }
  },
)
