/**
 * SERVIÇO — CONTRACHEQUES (Build C2)
 * ========================================================================
 * I/O do módulo Contracheque mensal via SDK PocketBase, coleções privadas
 * cc_contracheques e cc_lancamentos (mesmas regras restritas de
 * cc_salarios/cc_participantes — só o proprietário autorizado).
 *
 * GARANTIA DE NÃO-DUPLICIDADE: obterOuCriarContracheque consulta antes de
 * criar (mesmo padrão C1). O índice único no banco é a última defesa.
 *
 * Nenhuma operação de fechamento/pagamento é implementada neste build.
 */
import pb from '@/lib/pocketbase/client'

export interface ContrachequeRecord {
  id: string
  funcionario_id: string
  funcionario_nome: string
  competencia_mes: number
  competencia_ano: number
  tipo: 'folha'
  status: 'rascunho' | 'fechado' | 'pago'
  salario_base: number
  salario_nao_cadastrado: boolean
  observacoes: string
  created: string
  updated: string
  expand?: Record<string, unknown>
}

export interface LancamentoRecord {
  id: string
  contracheque: string
  natureza_tipo: 'vencimento' | 'desconto'
  natureza: string
  descricao: string
  valor: number
  created: string
  updated: string
}

export interface NovoContrachequeInput {
  funcionarioId: string
  funcionarioNome: string
  mes: number
  ano: number
  salarioBase: number
  salarioNaoCadastrado: boolean
}

/** Consulta o demonstrativo 'folha' do colaborador na competência (ou null). */
export async function buscarContracheque(
  funcionarioId: string,
  mes: number,
  ano: number,
): Promise<ContrachequeRecord | null> {
  try {
    return (await pb
      .collection('cc_contracheques')
      .getFirstListItem(
        `funcionario_id = '${funcionarioId}' && competencia_mes = ${mes} && competencia_ano = ${ano} && tipo = 'folha'`,
      )) as unknown as ContrachequeRecord
  } catch (e) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'status' in e &&
      (e as { status: number }).status === 404
    ) {
      return null
    }
    throw e
  }
}

/** Todos os demonstrativos 'folha' do colaborador (histórico de competências). */
export async function getContrachequesDoColaborador(
  funcionarioId: string,
): Promise<ContrachequeRecord[]> {
  return (await pb.collection('cc_contracheques').getFullList({
    filter: `funcionario_id = '${funcionarioId}' && tipo = 'folha'`,
    sort: '-competencia_ano,-competencia_mes',
  })) as unknown as ContrachequeRecord[]
}

/**
 * Consulta antes de criar: se já existe demonstrativo 'folha' do colaborador
 * na competência, devolve o MESMO registro (nunca duplica); senão, cria em
 * status 'rascunho' com o snapshot do salário-base gravado.
 */
export async function obterOuCriarContracheque(
  input: NovoContrachequeInput,
): Promise<ContrachequeRecord> {
  const existente = await buscarContracheque(input.funcionarioId, input.mes, input.ano)
  if (existente) return existente
  return (await pb.collection('cc_contracheques').create({
    funcionario_id: input.funcionarioId,
    funcionario_nome: input.funcionarioNome,
    competencia_mes: input.mes,
    competencia_ano: input.ano,
    tipo: 'folha',
    status: 'rascunho',
    salario_base: input.salarioBase,
    salario_nao_cadastrado: input.salarioNaoCadastrado,
  })) as unknown as ContrachequeRecord
}

/** Atualiza o snapshot salarial do demonstrativo (nunca automático — só quando a UI decide). */
export async function atualizarSnapshotSalario(
  contrachequeId: string,
  dados: { salarioBaseCentavos?: number; salarioNaoCadastrado?: boolean },
): Promise<void> {
  const dados_: Record<string, unknown> = {}
  if (dados.salarioBaseCentavos !== undefined) dados_.salario_base = dados.salarioBaseCentavos / 100
  if (dados.salarioNaoCadastrado !== undefined)
    dados_.salario_nao_cadastrado = dados.salarioNaoCadastrado
  await pb.collection('cc_contracheques').update(contrachequeId, dados_)
}

/** Lançamentos do demonstrativo (vencimentos + descontos). */
export async function getLancamentos(contrachequeId: string): Promise<LancamentoRecord[]> {
  return (await pb.collection('cc_lancamentos').getFullList({
    filter: `contracheque = '${contrachequeId}'`,
    sort: 'created',
  })) as unknown as LancamentoRecord[]
}

export async function adicionarLancamento(
  contrachequeId: string,
  dados: {
    natureza_tipo: 'vencimento' | 'desconto'
    natureza: string
    descricao: string
    valor: number
  },
): Promise<LancamentoRecord> {
  return (await pb.collection('cc_lancamentos').create({
    contracheque: contrachequeId,
    natureza_tipo: dados.natureza_tipo,
    natureza: dados.natureza,
    descricao: dados.descricao,
    valor: dados.valor,
  })) as unknown as LancamentoRecord
}

export async function atualizarLancamento(
  lancamentoId: string,
  dados: {
    natureza_tipo?: 'vencimento' | 'desconto'
    natureza?: string
    descricao?: string
    valor?: number
  },
): Promise<void> {
  await pb.collection('cc_lancamentos').update(lancamentoId, dados)
}

export async function excluirLancamento(lancamentoId: string): Promise<void> {
  await pb.collection('cc_lancamentos').delete(lancamentoId)
}
