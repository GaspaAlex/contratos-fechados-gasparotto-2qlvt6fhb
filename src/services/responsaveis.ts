import pb from '@/lib/pocketbase/client'

export interface Responsavel {
  id: string
  nome: string
  ativo: boolean
  created: string
  updated: string
}

/** Lista todos os responsáveis ordenados por nome (para telas de gestão). */
export const getResponsaveis = async (): Promise<Responsavel[]> =>
  await pb.collection('responsaveis').getFullList({ sort: 'nome' })

/** Lista apenas os responsáveis ativos, ordenados por nome (para os seletores). */
export const getResponsaveisAtivos = async (): Promise<Responsavel[]> =>
  await pb.collection('responsaveis').getFullList({
    filter: 'ativo = true',
    sort: 'nome',
  })

/** Cria um novo responsável com ativo true. */
export const createResponsavel = async (nome: string): Promise<Responsavel> =>
  await pb.collection('responsaveis').create({ nome, ativo: true })

/** Atualiza um responsável existente. */
export const updateResponsavel = async (
  id: string,
  data: { nome?: string; ativo?: boolean },
): Promise<Responsavel> => await pb.collection('responsaveis').update(id, data)
