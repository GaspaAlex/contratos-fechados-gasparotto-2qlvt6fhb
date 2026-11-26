import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

/**
 * SERVIÇO DA META MENSAL DE COMISSÕES (Build E1)
 * ==============================================
 * Coleção `comissoes_metas`: mes (1-12), ano, meta (qtd de contratos fechados).
 * Índice UNIQUE mes+ano garante NO MÁXIMO uma meta por competência.
 *
 * Regras do backend (migration 0108):
 *   - list/view: qualquer usuário autenticado;
 *   - create/update/delete: somente perfil gestor.
 *
 * Este módulo só conversa com a API — nenhum cálculo aqui (o cálculo puro é
 * `calcularMetaComissoes` em src/lib/comissaoMeta.ts).
 */
export interface ComissoesMeta {
  id: string
  mes: number
  ano: number
  meta: number
  created?: string
  updated?: string
}

export interface ComissoesMetaInput {
  mes: number
  ano: number
  meta: number
}

const COLLECTION = 'comissoes_metas'

/**
 * Meta de uma competência (mes/ano) ou null quando não há meta cadastrada
 * ("Meta não definida").
 */
export async function getMetaPorCompetencia(
  mes: number,
  ano: number,
): Promise<ComissoesMeta | null> {
  const registros = await pb.collection(COLLECTION).getFullList<ComissoesMeta>({
    filter: `mes = ${mes} && ano = ${ano}`,
  })
  return registros.length > 0 ? registros[0] : null
}

/** Todas as metas cadastradas, ordenadas por ano e mês. */
export async function getMetas(): Promise<ComissoesMeta[]> {
  return pb.collection(COLLECTION).getFullList<ComissoesMeta>({ sort: 'ano, mes' })
}

function mensagemErroSalvar(error: unknown): string {
  if (error instanceof ClientResponseError) {
    // 400 do índice UNIQUE mes+ano (conflito de competência já cadastrada).
    if (error.status === 400) {
      const texto = String(error.response?.message || '')
      if (texto.includes('UNIQUE') || texto.includes('idx_comissoes_metas_mes_ano')) {
        return 'Conflito: já existe uma meta cadastrada para esta competência (mês/ano). Recarregue e edite a meta existente.'
      }
      return texto || 'Dados inválidos ao salvar a meta (verifique mês, ano e valor).'
    }
    if (error.status === 403) {
      return 'Somente usuários com perfil gestor podem criar ou alterar a meta mensal.'
    }
  }
  return error instanceof Error ? error.message : 'Erro inesperado ao salvar a meta.'
}

/**
 * Cria OU ATUALIZA a meta de UMA competência (upsert pelo índice único mes+ano).
 * Salvar a meta de dezembro NÃO modifica a de novembro: o filtro é por
 * mes+ano e o PocketBase recusa (400 UNIQUE) qualquer duplicidade de
 * competência — nunca há dois registros para o mesmo mês/ano.
 */
export async function salvarMeta(input: ComissoesMetaInput): Promise<ComissoesMeta> {
  const existente = await getMetaPorCompetencia(input.mes, input.ano)
  if (existente) {
    try {
      return await pb
        .collection(COLLECTION)
        .update<ComissoesMeta>(existente.id, { meta: input.meta })
    } catch (error) {
      throw new Error(mensagemErroSalvar(error))
    }
  }
  try {
    return await pb.collection(COLLECTION).create<ComissoesMeta>({
      mes: input.mes,
      ano: input.ano,
      meta: input.meta,
    })
  } catch (error) {
    // Disputa de concorrência (dois gestores ao mesmo tempo): tenta atualizar.
    if (error instanceof ClientResponseError && error.status === 400) {
      try {
        return await salvarMeta(input)
      } catch (retryError) {
        throw new Error(mensagemErroSalvar(retryError))
      }
    }
    throw new Error(mensagemErroSalvar(error))
  }
}
