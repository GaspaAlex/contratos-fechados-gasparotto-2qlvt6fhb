/**
 * SERVIÇO — PARTICIPANTES DO MÓDULO CONTRACHEQUES (cc_participantes)
 * ========================================================================
 * A collection cc_participantes é a seleção PRIVADA de funcionários que
 * aparecem na aba Contracheques (Build C1-A). Os funcionários vivem na
 * collection funcionarios (Cartão de Ponto) e NÃO são alterados aqui: um
 * participante é só um VÍNCULO (relation + ativo), não um cadastro.
 *
 * Regras de segurança idênticas às de cc_salarios: TODAS as cinco operações
 * exigem o usuário autorizado (ID yxubawrt8aser8k / e-mail escritorio@
 * advocaciagasparotto.com.br) — qualquer outro usuário leva 403/404 do
 * backend, então este serviço falha FECHADO para quem não é autorizado.
 *
 * NÃO grava salários nem qualquer dado financeiro; não exclui funcionários,
 * não toca no Cartão de Ponto e não altera situação ativo/inativo de ninguém.
 *
 * A LÓGICA pura vive em src/lib/ccParticipantes.ts (executada de verdade pelo
 * runner de cenários); este arquivo é só I/O + adaptação de tipos do SDK.
 */
import pb from '@/lib/pocketbase/client'
import type { FuncionarioCC } from '@/services/ccSalarios'
import {
  resolverParticipantesAtivos as resolverAtivos,
  type ParticipanteVinculo,
  type ParticipanteResolvido,
  type FuncionarioMini,
} from '@/lib/ccParticipantes'

export type { ParticipanteVinculo, ParticipanteResolvido, FuncionarioMini }

/** Registro de cc_participantes no formato devolvido pelo SDK. */
export interface ParticipanteRecord extends ParticipanteVinculo {
  observacao: string
  created: string
  updated: string
  expand?: { funcionario?: FuncionarioMini }
}

/** Lista TODOS os vínculos (ativos e inativos), com o funcionário expandido. */
export async function getParticipantes(): Promise<ParticipanteRecord[]> {
  return await pb.collection('cc_participantes').getFullList<ParticipanteRecord>({
    expand: 'funcionario',
  })
}

/**
 * Funcionários do Cartão de Ponto disponíveis para virar participantes —
 * os que ainda não têm vínculo em cc_participantes (não duplica vínculo).
 */
export async function getFuncionariosDisponiveis(
  participantes: ParticipanteRecord[],
): Promise<FuncionarioCC[]> {
  const todos = await pb.collection('funcionarios').getFullList({
    sort: 'nome',
  })
  const vinculados = new Set(participantes.map((p) => p.funcionario))
  return todos
    .filter((f: Record<string, unknown>) => !vinculados.has(String(f.id ?? '')))
    .map((f: Record<string, unknown>) => ({
      id: String(f.id ?? ''),
      nome: String(f.nome ?? ''),
      ativo: Boolean(f.ativo),
      perfil: f.perfil ? String(f.perfil) : undefined,
      user_id: f.user_id ? String(f.user_id) : undefined,
    }))
}

/** Cria o vínculo de um funcionário como participante ativo. */
export async function adicionarParticipante(funcionarioId: string): Promise<ParticipanteRecord> {
  return await pb.collection('cc_participantes').create<ParticipanteRecord>({
    funcionario: funcionarioId,
    ativo: true,
    observacao: '',
  })
}

/**
 * RETIRADA de participante: desativa o vínculo (ativo=false). O histórico
 * salarial em cc_salarios é PRESERVADO — nada aqui apaga registro salarial,
 * e a collection funcionarios permanece intacta.
 */
export async function desativarParticipante(vinculoId: string): Promise<ParticipanteRecord> {
  return await pb.collection('cc_participantes').update<ParticipanteRecord>(vinculoId, {
    ativo: false,
  })
}

/** Readiciona (reativa) um vínculo existente sem duplicar. */
export async function reativarParticipante(vinculoId: string): Promise<ParticipanteRecord> {
  return await pb.collection('cc_participantes').update<ParticipanteRecord>(vinculoId, {
    ativo: true,
  })
}

/**
 * Resolve a lista da aba Contracheques: participantes ATIVOS ordenados por
 * nome. Vínculos inativos ficam fora da listagem (sem apagar nada).
 */
export function resolverParticipantesAtivos(
  participantes: ParticipanteRecord[],
): ParticipanteResolvido[] {
  return resolverAtivos(
    participantes,
    participantes.map((p) => p.expand?.funcionario).filter((f): f is FuncionarioMini => !!f),
  )
}
