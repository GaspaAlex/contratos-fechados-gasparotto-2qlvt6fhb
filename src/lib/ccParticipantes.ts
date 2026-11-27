/**
 * FUNÇÕES PURAS — PARTICIPANTES DO MÓDULO CONTRACHEQUES (Builds C1-A e C1-B)
 * ========================================================================
 * Sem acesso a banco (o I/O fica em src/services/ccParticipantes.ts) — é o
 * módulo que o runner de cenários executa de verdade.
 *
 * Modelo (C1-B): um participante é um VÍNCULO que aponta para UMA identidade:
 *   - `funcionario`  → registro do Cartão de Ponto (collection funcionarios);
 *   - `colaborador`  → cadastro próprio do módulo (cc_colaboradores, C1-B),
 *     para quem não participa do Cartão de Ponto.
 * Exatamente um dos dois é preenchido por vínculo.
 *
 * - A listagem da aba mostra somente vínculos ATIVOS.
 * - RETIRAR participante = desativar o vínculo — o histórico salarial
 *   eventual em cc_salarios é PRESERVADO (nunca há delete de salário aqui).
 * - Readicionar/reativar é idempotente (nunca duplica vínculo).
 * - CADASTRO de colaborador novo (C1-B) é planejado por
 *   planejarCadastroColaborador: normaliza o nome, detecta homônimo e NUNCA
 *   cria duplicado — reutiliza o cadastro/vínculo existente.
 * - A collection funcionarios (Cartão de Ponto) NÃO é alterada por nada daqui.
 */

/** Registro de cc_participantes (dados mínimos para as regras). */
export interface ParticipanteVinculo {
  id: string
  /** Relation → funcionarios (Cartão de Ponto) — preenchido OU `colaborador`. */
  funcionario?: string
  /** Relation → cc_colaboradores (cadastro próprio do módulo, Build C1-B). */
  colaborador?: string
  ativo: boolean
}

/** Funcionário expandido (dados mínimos para as regras). */
export interface FuncionarioMini {
  id: string
  nome: string
  ativo: boolean
  perfil?: string
}

/** Cadastro próprio do módulo (cc_colaboradores, Build C1-B). */
export interface ColaboradorMini {
  id: string
  nome: string
  ativo: boolean
}

/** Vínculo já resolvido (participante + identidade), pronto para a tela. */
export interface ParticipanteResolvido {
  vinculoId: string
  funcionarioId?: string
  colaboradorId?: string
  nome: string
  ativoNoCartao: boolean
  perfil?: string
}

/** Remove acentos, colapsa espaços e baixa a caixa — base do dedupe de nomes. */
export function canonicalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Resolve a listagem da aba Contracheques: somente vínculos ATIVOS que têm a
 * identidade resolvível (funcionário OU colaborador), ordenados por nome
 * (pt-BR). Vínculos inativos ficam de fora SEM serem apagados; salários nunca
 * são tocados por esta função.
 */
export function resolverParticipantesAtivos(
  vinculos: ParticipanteVinculo[],
  funcionarios: FuncionarioMini[],
  colaboradores: ColaboradorMini[] = [],
): ParticipanteResolvido[] {
  const porId = new Map(funcionarios.map((f) => [f.id, f]))
  const porIdColab = new Map(colaboradores.map((c) => [c.id, c]))
  const vistos = new Set<string>() // nomes canônicos já exibidos (dedupe)
  return vinculos
    .map((v): ParticipanteResolvido | null => {
      if (v.ativo && v.funcionario && porId.has(v.funcionario)) {
        const f = porId.get(v.funcionario)!
        return {
          vinculoId: v.id,
          funcionarioId: f.id,
          nome: f.nome,
          ativoNoCartao: f.ativo,
          perfil: f.perfil,
        }
      }
      if (v.ativo && !v.funcionario && v.colaborador && porIdColab.has(v.colaborador)) {
        const c = porIdColab.get(v.colaborador)!
        return {
          vinculoId: v.id,
          colaboradorId: c.id,
          nome: c.nome,
          ativoNoCartao: true,
        }
      }
      return null
    })
    .filter((p): p is ParticipanteResolvido => {
      if (p === null) return false
      // Dedupe de exibição: dois vínculos ativos para a MESMA pessoa (ex. o
      // registro antigo duplicado da Nataly em funcionarios) mostram um
      // participante só — o primeiro vínculo criado vence.
      const chave = canonicalizarNome(p.nome)
      if (vistos.has(chave)) return false
      vistos.add(chave)
      return true
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/**
 * Decide o que fazer ao "adicionar" um funcionário à listagem:
 * - sem vínculo existente  → criar (ativo)
 * - vínculo inativo        → REATIVAR o mesmo vínculo (idempotente)
 * - vínculo já ativo       → nada a fazer (idempotente)
 * Nunca sugere criar um segundo vínculo para o mesmo funcionário.
 */
export function planejarAdicaoParticipante(
  vinculos: ParticipanteVinculo[],
  funcionarioId: string,
): { acao: 'criar' | 'reativar' | 'nada'; vinculoId?: string } {
  const existente = vinculos.find((v) => v.funcionario === funcionarioId)
  if (!existente) return { acao: 'criar' }
  if (!existente.ativo) return { acao: 'reativar', vinculoId: existente.id }
  return { acao: 'nada', vinculoId: existente.id }
}

/**
 * RETIRADA de participante: é sempre DESATIVAÇÃO do vínculo (ativo=false),
 * nunca exclusão — o histórico salarial do funcionário permanece intacto.
 */
export function planejarRetiradaParticipante(
  vinculos: ParticipanteVinculo[],
  funcionarioId: string,
): { acao: 'desativar' | 'nada'; vinculoId?: string } {
  const existente = vinculos.find((v) => v.funcionario === funcionarioId)
  if (existente && existente.ativo) return { acao: 'desativar', vinculoId: existente.id }
  return { acao: 'nada', vinculoId: existente?.id }
}

/**
 * Plano de CADASTRO de colaborador pelo formulário da aba (Build C1-B).
 * Sempre reutiliza identidade existente — nunca cria duplicado:
 *   - nome já tem vínculo ATIVO em cc_participantes (funcionário ou
 *     colaborador) → 'existente_ativo';
 *   - nome tem vínculo INATIVO → 'reativar' esse mesmo vínculo (sem
 *     segundo cadastro e sem segundo vínculo);
 *   - nome existe em cc_colaboradores (mesmo sem vínculo) → 'reusar_cadastro';
 *   - nome existe no Cartão de Ponto (funcionarios) → 'reusar_funcionario':
 *     em vez de criar cadastro novo em outra coleção, cria vínculo para o
 *     funcionário existente (evita duplicar a pessoa entre coleções — caso do
 *     registro antigo duplicado da Nataly);
 *   - ninguém com esse nome → 'criar' cadastro novo em cc_colaboradores.
 *
 * A comparação usa canonicalizarNome (sem acento/caixa/espaços extras), então
 * "Nataly Tayna  Silva" e "nataly tayna figueiredo da silva" colidem.
 * Nome vazio → 'invalido' (o formulário deve tratar antes de gravar).
 * Nomes MUITO próximos geram 'aviso_aproximado' — o dialog mostra o aviso e
 * exige confirmação explícita para gravar um cadastro novo (o usuário decide;
 * nada é criado sozinho). "Próximo" = todos os tokens do nome MENOR aparecem
 * no maior ("Nataly Silva" ⊂ "Nataly Tayna Figueiredo da Silva"), o que pega
 * abreviações e nomes incompletos sem confundir "João Silva" com
 * "Nataly … da Silva" (o token "joão" impede o falso positivo).
 */
export type PlanoCadastroColaborador = {
  acao:
    | 'invalido'
    | 'existente_ativo'
    | 'reativar'
    | 'reusar_cadastro'
    | 'reusar_funcionario'
    | 'aviso_aproximado'
    | 'criar'
  vinculoId?: string
  funcionarioId?: string
  colaboradorId?: string
  nomeConflito?: string
}

export function planejarCadastroColaborador(
  nomeInput: string,
  vinculos: ParticipanteVinculo[],
  funcionarios: FuncionarioMini[],
  colaboradores: ColaboradorMini[],
): PlanoCadastroColaborador {
  const erro = validarCadastroColaborador(nomeInput)
  if (erro) return { acao: 'invalido', nomeConflito: erro }

  const chave = canonicalizarNome(nomeInput)

  // Homônimo já participante ativo (funcionário ou colaborador)?
  for (const f of funcionarios) {
    if (canonicalizarNome(f.nome) === chave) {
      const v = vinculos.find((x) => x.funcionario === f.id)
      if (v && v.ativo) {
        return {
          acao: 'existente_ativo',
          vinculoId: v.id,
          funcionarioId: f.id,
          nomeConflito: f.nome,
        }
      }
      break
    }
  }
  for (const c of colaboradores) {
    if (canonicalizarNome(c.nome) === chave) {
      const v = vinculos.find((x) => x.colaborador === c.id)
      if (v && v.ativo) {
        return {
          acao: 'existente_ativo',
          vinculoId: v.id,
          colaboradorId: c.id,
          nomeConflito: c.nome,
        }
      }
      break
    }
  }

  // Homônimo com vínculo INATIVO → reativar (sem duplicar vínculo/cadastro).
  for (const v of vinculos) {
    if (!v.ativo) {
      if (v.funcionario) {
        const f = funcionarios.find((x) => x.id === v.funcionario)
        if (f && canonicalizarNome(f.nome) === chave) {
          return { acao: 'reativar', vinculoId: v.id, funcionarioId: f.id, nomeConflito: f.nome }
        }
      } else if (v.colaborador) {
        const c = colaboradores.find((x) => x.id === v.colaborador)
        if (c && canonicalizarNome(c.nome) === chave) {
          return { acao: 'reativar', vinculoId: v.id, colaboradorId: c.id, nomeConflito: c.nome }
        }
      }
    }
  }

  // Homônimo em cc_colaboradores sem vínculo → reusar o cadastro.
  for (const c of colaboradores) {
    if (canonicalizarNome(c.nome) === chave) {
      return { acao: 'reusar_cadastro', colaboradorId: c.id, nomeConflito: c.nome }
    }
  }

  // Homônimo no Cartão de Ponto → vínculo para o funcionário existente.
  // (caso do registro antigo duplicado da Nataly: não gera segunda pessoa)
  for (const f of funcionarios) {
    if (canonicalizarNome(f.nome) === chave) {
      return { acao: 'reusar_funcionario', funcionarioId: f.id, nomeConflito: f.nome }
    }
  }

  // Nomes muito próximos (um contém o outro) → aviso antes de criar.
  const todosNomes: Array<{ nome: string; id: string; tipo: 'funcionario' | 'colaborador' }> = [
    ...funcionarios.map((f) => ({ nome: f.nome, id: f.id, tipo: 'funcionario' as const })),
    ...colaboradores.map((c) => ({ nome: c.nome, id: c.id, tipo: 'colaborador' as const })),
  ]
  for (const t of todosNomes) {
    const chaveT = canonicalizarNome(t.nome)
    if (!chaveT) continue
    // Substring direta OU todos os tokens do nome menor presentes no maior
    // ("Nataly Silva" ⊂ "Nataly Tayna Figueiredo da Silva" → aviso). Um único
    // token diferente (ex. "João" em "João Silva" vs "Maria da Silva") já
    // impede o aviso — nomes realmente distintos passam direto.
    const tokensA = chave.split(' ').filter(Boolean)
    const tokensB = chaveT.split(' ').filter(Boolean)
    const [menor, maior] =
      tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA]
    const todosContidos = menor.every((tk) => maior.includes(tk))
    if (chaveT.includes(chave) || chave.includes(chaveT) || todosContidos) {
      return { acao: 'aviso_aproximado', nomeConflito: t.nome }
    }
  }

  return { acao: 'criar' }
}

/** Validação do formulário de cadastro (nome completo, mínimo 2 palavras). */
export function validarCadastroColaborador(nome: string): string | null {
  const limpo = nome.trim()
  if (!limpo) return 'Informe o nome completo do colaborador.'
  if (limpo.length < 3) return 'O nome é curto demais — informe o nome completo.'
  if (!limpo.includes(' ')) return 'Informe o nome completo (nome e sobrenome).'
  return null
}
