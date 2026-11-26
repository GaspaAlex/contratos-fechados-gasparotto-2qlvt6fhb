import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

/**
 * SERVIÇO — COLABORADORES COMISSIONADOS E REGRAS POR COMPETÊNCIA (Build F1)
 * =========================================================================
 * Coleções (migration 0109):
 *   - comissoes_colaboradores: nome, ativo (bool), ordem (número);
 *   - comissoes_regras: colaborador (relation OBRIGATÓRIA), modalidade
 *     (fixa | condicionada_meta), valor, vigencia_inicio (AAAA-MM) e
 *     vigencia_fim (AAAA-MM, opcional/vazio = em vigor).
 *
 * Regras de acesso no BACKEND (mesmo padrão de comissoes_metas):
 *   - list/view: qualquer usuário autenticado;
 *   - create/update/delete: somente perfil gestor (403 para os demais).
 *
 * SEM EXCLUSÃO FÍSICA PELA INTERFACE: este serviço NÃO expõe delete. O
 * encerramento de uma participação é feito por vigencia_fim (fim de vigência
 * da regra) e/ou ativo = false no colaborador — o histórico permanece.
 *
 * HISTÓRICO: alterar o valor a partir de uma competência futura = encerrar a
 * regra anterior (vigencia_fim = mês anterior) + CRIAR nova regra
 * (fecharRegraE criarRegra). Nunca se edita regra já iniciada — o backend
 * recusa (histórico imutável).
 *
 * Nenhuma interface de gestão é criada neste build (fica para o F2).
 */

export interface ColaboradorComissionadoRecord {
  id: string
  nome: string
  ativo: boolean
  ordem: number
  created?: string
  updated?: string
}

export interface RegraComissaoRecord {
  id: string
  colaborador: string
  modalidade: 'fixa' | 'condicionada_meta'
  valor: number
  vigencia_inicio: string
  vigencia_fim?: string | null
  created?: string
  updated?: string
}

const COLABORADORES = 'comissoes_colaboradores'
const REGRAS = 'comissoes_regras'

/** Todos os colaboradores cadastrados (ativos e inativos), por ordem/nome. */
export async function getColaboradoresComissionados(): Promise<ColaboradorComissionadoRecord[]> {
  return pb
    .collection(COLABORADORES)
    .getFullList<ColaboradorComissionadoRecord>({ sort: 'ordem, nome' })
}

/** Todas as regras de vigência cadastradas, ordenadas por início. */
export async function getRegrasComissao(): Promise<RegraComissaoRecord[]> {
  return pb
    .collection(REGRAS)
    .getFullList<RegraComissaoRecord>({ sort: 'colaborador, vigencia_inicio' })
}

/** Cria um colaborador comissionado (somente gestor — 403 para os demais). */
export async function criarColaboradorComissionado(input: {
  nome: string
  ativo?: boolean
  ordem?: number
}): Promise<ColaboradorComissionadoRecord> {
  try {
    return await pb.collection(COLABORADORES).create<ColaboradorComissionadoRecord>({
      nome: input.nome.trim(),
      ativo: input.ativo ?? true,
      ordem: input.ordem ?? 0,
    })
  } catch (error) {
    throw new Error(mensagemErroColaborador(error))
  }
}

/** Ativa/desativa um colaborador (situação administrativa ATUAL; não apaga histórico). */
export async function setColaboradorAtivo(id: string, ativo: boolean): Promise<void> {
  try {
    await pb.collection(COLABORADORES).update(id, { ativo })
  } catch (error) {
    throw new Error(mensagemErroColaborador(error))
  }
}

/** Atualiza nome e/ou ordem de exibição (não toca no histórico de regras). */
export async function atualizarColaboradorComissionado(
  id: string,
  patch: { nome?: string; ordem?: number },
): Promise<void> {
  try {
    await pb.collection(COLABORADORES).update(id, patch)
  } catch (error) {
    throw new Error(mensagemErroColaborador(error))
  }
}

/**
 * Cria uma NOVA regra de vigência. O backend recusa (400) sobreposição com
 * regra existente do mesmo colaborador e competência anterior a nov/2026.
 */
export async function criarRegraComissao(input: {
  colaborador: string
  modalidade: 'fixa' | 'condicionada_meta'
  valor: number
  vigencia_inicio: string
  vigencia_fim?: string | null
}): Promise<RegraComissaoRecord> {
  try {
    return await pb.collection(REGRAS).create<RegraComissaoRecord>({
      colaborador: input.colaborador,
      modalidade: input.modalidade,
      valor: input.valor,
      vigencia_inicio: input.vigencia_inicio,
      vigencia_fim: input.vigencia_fim || '',
    })
  } catch (error) {
    throw new Error(mensagemErroRegra(error))
  }
}

/**
 * Encerra a vigência de uma regra (vigencia_fim = competência informada,
 * INCLUSIVA). Único campo editável numa regra já iniciada — o backend recusa
 * qualquer outra alteração em regra vigente (histórico imutável).
 */
export async function encerrarVigenciaRegra(id: string, vigencia_fim: string): Promise<void> {
  try {
    await pb.collection(REGRAS).update(id, { vigencia_fim })
  } catch (error) {
    throw new Error(mensagemErroRegra(error))
  }
}

/**
 * ALTERAÇÃO DE VALOR FUTURO — operação composta do padrão do gestor:
 *   1. fecha a regra vigente (vigencia_fim = mês ANTERIOR ao novo início);
 *   2. cria a nova regra com vigencia_inicio informado.
 * A segunda etapa refaz a primeira (idempotente: refechar com o mesmo fim não
 * altera nada) — se a criação da nova regra falhar, o gestor pode tentar
 * novamente sem corromper o histórico. A atomicidade entre as duas chamadas
 * HTTP não é garantível por essa arquitetura (duas requisições); a proteção
 * contra sobreposição no backend impede qualquer estado ambíguo de vigor
 * duplo, e a ausência da nova regra é um estado seguro (colaborador sem regra
 * vigente na competência — nunca um valor errado).
 */
export async function alterarValorFuturo(params: {
  regraVigenteId: string
  novaVigenciaInicio: string
  modalidade: 'fixa' | 'condicionada_meta'
  valor: number
}): Promise<RegraComissaoRecord> {
  const inicio = params.novaVigenciaInicio
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(inicio)) {
    throw new Error('Competência de início inválida: use o formato AAAA-MM (mês 01–12).')
  }
  const [ano, mes] = inicio.split('-').map(Number)
  const fimAnterior = mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, '0')}`

  await encerrarVigenciaRegra(params.regraVigenteId, fimAnterior)
  try {
    return await criarRegraComissao({
      colaborador: (await pb.collection(REGRAS).getOne<RegraComissaoRecord>(params.regraVigenteId))
        .colaborador,
      modalidade: params.modalidade,
      valor: params.valor,
      vigencia_inicio: inicio,
      vigencia_fim: '',
    })
  } catch (error) {
    // A regra antiga segue fechada (estado seguro). Propaga mensagem clara —
    // o gestor pode recriar a nova regra sem perder o histórico.
    throw new Error(
      `A vigência anterior foi encerrada em ${fimAnterior}, mas a NOVA regra não pôde ser criada: ${mensagemErroRegra(error)} Crie a nova regra para ${inicio} sem alterar a anterior.`,
    )
  }
}

function mensagemErroColaborador(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.status === 403) {
      return 'Somente usuários com perfil gestor podem criar ou alterar colaboradores comissionados.'
    }
    if (error.status === 400) {
      const texto = String(error.response?.message || '')
      if (texto.includes('nome')) {
        return 'Nome inválido: informe um nome com pelo menos 2 letras.'
      }
      return texto || 'Dados inválidos ao salvar o colaborador.'
    }
  }
  return error instanceof Error ? error.message : 'Erro inesperado ao salvar o colaborador.'
}

function mensagemErroRegra(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.status === 403) {
      return 'Somente usuários com perfil gestor podem criar ou alterar regras de comissão.'
    }
    if (error.status === 400) {
      const texto = String(error.response?.message || '')
      // Mensagens do pb_hook de sobreposição/histórico chegam prontas — preserva.
      if (
        texto.includes('Conflito de vigência') ||
        texto.includes('histórico imutável') ||
        texto.includes('Vigência') ||
        texto.includes('nov/2026') ||
        texto.includes('Validação de vigências')
      ) {
        return texto
      }
      if (texto.includes('UNIQUE') || texto.includes('idx_comissoes_regras')) {
        return 'Conflito: este colaborador já possui uma regra com esta competência de início. Feche a vigência anterior e crie uma nova regra com outro início.'
      }
      return (
        texto || 'Dados inválidos ao salvar a regra (verifique colaborador, valor e vigências).'
      )
    }
  }
  return error instanceof Error ? error.message : 'Erro inesperado ao salvar a regra.'
}
