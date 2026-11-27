/**
 * SERVIÇO — COLABORADORES DO MÓDULO CONTRACHEQUES (cc_colaboradores, C1-B)
 * ========================================================================
 * Cadastro PRÓPRIO do módulo Contracheques para colaboradores que NÃO
 * participam do Cartão de Ponto: aqui só vive o essencial para identificar a
 * pessoa (nome completo + ativo). Sem salário, sem usuário de acesso ao site,
 * sem relação com a collection funcionarios (que segue intocada).
 *
 * Segurança igual às demais coleções privadas do módulo: TODAS as cinco
 * operações exigem o usuário autorizado (ID yxubawrt8aser8k / escritorio@)
 * no backend — este serviço falha fechado para qualquer outro usuário.
 *
 * A LÓGICA pura (dedupe, semelhança, planos) vive em src/lib/ccParticipantes.ts
 * e é executada de verdade pelo runner de cenários (CONTRACHEQUES_P).
 */
import pb from '@/lib/pocketbase/client'
import type { ColaboradorMini } from '@/lib/ccParticipantes'

/** Registro de cc_colaboradores no formato devolvido pelo SDK. */
export interface ColaboradorRecord extends ColaboradorMini {
  criado_por: string
  created: string
  updated: string
}

/** Lista todos os colaboradores do módulo (ativos e inativos), por nome. */
export async function getColaboradoresCC(): Promise<ColaboradorRecord[]> {
  return await pb.collection('cc_colaboradores').getFullList<ColaboradorRecord>({
    sort: 'nome',
  })
}

/** Cria o cadastro do colaborador (nome completo; ativo por padrão). */
export async function criarColaboradorCC(input: {
  nome: string
  criado_por: string
}): Promise<ColaboradorRecord> {
  return await pb.collection('cc_colaboradores').create<ColaboradorRecord>({
    nome: input.nome.trim(),
    ativo: true,
    criado_por: input.criado_por,
  })
}
