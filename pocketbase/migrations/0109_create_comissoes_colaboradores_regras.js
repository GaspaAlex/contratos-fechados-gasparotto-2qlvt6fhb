// BUILD F1 — ESTRUTURA DINÂMICA DE COLABORADORES COMISSIONADOS
// ============================================================
// Duas collections NOVAS, aditivas, sem tocar em nada existente:
//   1. comissoes_colaboradores — cadastro dos comissionados
//   2. comissoes_regras       — vigências/modaisidade/valor por competência
//
// HISTÓRICO POR COMPETÊNCIA (o princípio central):
//   - A comissão de uma competência vem da regra VIGENTE nela — nunca se
//     recalcula o passado com valores novos.
//   - "Mudar o valor a partir de jan/2027" = encerrar a regra anterior
//     (vigencia_fim) + criar nova regra com vigencia_inicio jan/2027.
//   - `ativo` do colaborador é situação administrativa ATUAL: inativo não
//     paga em competências FUTURAS, mas preserva o histórico onde havia
//     regra vigente (o financeiro é definido pelas vigências).
//
// MODALIDADES:
//   - fixa            → integra sempre o total confirmado da competência;
//   - condicionada_meta → integra só quando a meta mensal estiver atingida.
//
// ÍNDICE ÚNICO colaborador + vigencia_inicio: no máximo uma regra por início.
//
// REGRAS DE ACESSO (padrão comissoes_metas):
//   - list/view: qualquer usuário autenticado;
//   - create/update/delete: somente perfil gestor.
// Sem exclusão física pela interface (o serviço nunca chama delete):
//   o encerramento é por vigencia_fim e a saída por ativo=false.

migrate(
  (app) => {
    // ---------------------------------------------------------------
    // comissoes_colaboradores
    // ---------------------------------------------------------------
    const colaboradores = new Collection({
      type: 'base',
      name: 'comissoes_colaboradores',
      fields: [
        { type: 'text', name: 'nome', required: true, min: 2, max: 120 },
        { type: 'bool', name: 'ativo' },
        { type: 'number', name: 'ordem', onlyInt: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_comissoes_colaboradores_nome ON comissoes_colaboradores (nome)',
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
    })
    app.save(colaboradores)

    // ---------------------------------------------------------------
    // comissoes_regras — relação OBRIGATÓRIA com comissoes_colaboradores
    // ---------------------------------------------------------------
    const regras = new Collection({
      type: 'base',
      name: 'comissoes_regras',
      fields: [
        {
          type: 'relation',
          name: 'colaborador',
          required: true,
          collectionId: colaboradores.id,
          maxSelect: 1,
        },
        {
          type: 'select',
          name: 'modalidade',
          required: true,
          values: ['fixa', 'condicionada_meta'],
          maxSelect: 1,
        },
        { type: 'number', name: 'valor', required: true },
        {
          type: 'text',
          name: 'vigencia_inicio',
          required: true,
          min: 7,
          max: 7,
          pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$',
        },
        {
          type: 'text',
          name: 'vigencia_fim',
          min: 7,
          max: 7,
          pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$',
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_comissoes_regras_colaborador_inicio ON comissoes_regras (colaborador, vigencia_inicio)',
        'CREATE INDEX idx_comissoes_regras_colaborador ON comissoes_regras (colaborador)',
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'gestor'",
    })
    app.save(regras)
  },
  (app) => {
    // Reversão: regras antes de colaboradores (relation).
    const ids = ['comissoes_regras', 'comissoes_colaboradores']
    for (const id of ids) {
      try {
        app.delete(app.findCollectionByNameOrId(id))
      } catch {
        // já inexistente — down idempotente
      }
    }
  },
)
