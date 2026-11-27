/**
 * SERVIÇO — PARTICIPANTES DO MÓDULO CONTRACHEQUES (cc_participantes)
 * ========================================================================
 * A collection cc_participantes é a seleção PRIVADA de colaboradores que
 * aparecem na aba Contracheques (Builds C1-A e C1-B). Cada vínculo aponta
 * para UMA identidade:
 *   - `funcionario`  → registro do Cartão de Ponto (collection funcionarios);
 *   - `colaborador`  → cadastro próprio do módulo (cc_colaboradores, C1-B),
 *     para quem não participa do Cartão de Ponto.
 *
 * Regras de segurança idênticas às de cc_salarios: TODAS as cinco operações
 * exigem o usuário autorizado (ID yxubawrt8aser8k / e-mail escritorio@
 * advocaciagasparotto.com.br) — qualquer outro usuário leva 403/404 do
 * backend, então este serviço falha FECHADO para quem não é autorizado.
 *
 * NÃO grava salários; não exclui funcionários, não toca no Cartão de Ponto e
 * não altera situação ativo/inativo de ninguém. A LÓGICA pura vive em
 * src/lib/ccParticipantes.ts (executada de verdade pelo runner de cenários).
 */
import pb from '@/lib/pocketbase/client'
import {
  resolverParticipantesAtivos as resolverAtivos,
  type ColaboradorMini,
  type ParticipanteVinculo,
  type ParticipanteResolvido,
  type FuncionarioMini,
} from '@/lib/ccParticipantes'
import { getColaboradoresCC } from '@/services/ccColaboradores'

export type { ParticipanteVinculo, ParticipanteResolvido, FuncionarioMini, ColaboradorMini }

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
 * Resolve a lista da aba Contracheques: participantes ATIVOS ordenados por
 * nome — resolvendo funcionários do Cartão de Ponto E colaboradores próprios
 * do módulo (cc_colaboradores). Vínculos inativos ficam fora (sem apagar).
 */
export async function listarParticipantesResolvidos(): Promise<ParticipanteResolvido[]> {
  const [vinculos, colaboradores] = await Promise.all([getParticipantes(), getColaboradoresCC()])
  const funcionarios: FuncionarioMini[] = vinculos
    .map((p) => p.expand?.funcionario)
    .filter((f): f is FuncionarioMini => !!f)
  const cols: ColaboradorMini[] = colaboradores.map((c) => ({
    id: c.id,
    nome: c.nome,
    ativo: c.ativo,
  }))
  return resolverAtivos(vinculos, funcionarios, cols)
}

/** Cria o vínculo ativo de um funcionário do Cartão de Ponto como participante. */
export async function adicionarParticipante(funcionarioId: string): Promise<ParticipanteRecord> {
  return await pb.collection('cc_participantes').create<ParticipanteRecord>({
    funcionario: funcionarioId,
    ativo: true,
    observacao: '',
  })
}

/** Cria o vínculo ativo de um colaborador próprio (cc_colaboradores). */
export async function adicionarVinculoColaborador(
  colaboradorId: string,
): Promise<ParticipanteRecord> {
  return await pb.collection('cc_participantes').create<ParticipanteRecord>({
    colaborador: colaboradorId,
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
