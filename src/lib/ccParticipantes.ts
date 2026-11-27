/**
 * FUNÇÕES PURAS — PARTICIPANTES DO MÓDULO CONTRACHEQUES (Build C1-A)
 * ========================================================================
 * Sem acesso a banco (o I/O fica em src/services/ccParticipantes.ts) — é o
 * módulo que o runner de cenários executa de verdade.
 *
 * Modelo: um participante é um VÍNCULO (relation funcionarios + ativo).
 * - A listagem da aba mostra somente vínculos ATIVOS.
 * - RETIRAR participante = desativar o vínculo — o histórico salarial
 *   eventual em cc_salarios é PRESERVADO (nunca há delete de salário aqui).
 * - Readicionar um funcionário retirado REATIVA o vínculo (idempotente,
 *   sem duplicar: o índice único de funcionario garante 1 vínculo por
 *   funcionário).
 * - A collection funcionarios (Cartão de Ponto) NÃO é alterada por nada daqui.
 */

/** Registro de cc_participantes (dados mínimos para as regras). */
export interface ParticipanteVinculo {
  id: string
  funcionario: string
  ativo: boolean
}

/** Funcionário expandido (dados mínimos para as regras). */
export interface FuncionarioMini {
  id: string
  nome: string
  ativo: boolean
  perfil?: string
}

/** Vínculo já resolvido (participante + funcionário), pronto para a tela. */
export interface ParticipanteResolvido {
  vinculoId: string
  funcionarioId: string
  nome: string
  ativoNoCartao: boolean
  perfil?: string
}

/**
 * Resolve a listagem da aba Contracheques: somente vínculos ATIVOS que têm o
 * funcionário resolvível, ordenados por nome (pt-BR). Vínculos inativos ficam
 * de fora SEM serem apagados; salários nunca são tocados por esta função.
 */
export function resolverParticipantesAtivos(
  vinculos: ParticipanteVinculo[],
  funcionarios: FuncionarioMini[],
): ParticipanteResolvido[] {
  const porId = new Map(funcionarios.map((f) => [f.id, f]))
  return vinculos
    .filter((v) => v.ativo && porId.has(v.funcionario))
    .map((v) => {
      const f = porId.get(v.funcionario)!
      return {
        vinculoId: v.id,
        funcionarioId: f.id,
        nome: f.nome,
        ativoNoCartao: f.ativo,
        perfil: f.perfil,
      }
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
