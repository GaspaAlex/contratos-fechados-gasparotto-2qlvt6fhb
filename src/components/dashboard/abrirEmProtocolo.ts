import pb from '@/lib/pocketbase/client'
import { toYMD } from '@/services/contratos'

/** Pré-preenchimento do novo registro de Protocolo a partir do contrato. */
export interface AbrirEmProtocoloPrefill {
  contratoId: string
  nome: string
  fone: string
  tipo_acao_nome: string
  status: string
  dprotocolo: string
  dcontrato: string
  dcalculo: string
  valor: number | undefined
  nautos: string
}

/**
 * Equivalências confirmadas: nome, fone, dprotocolo (no contrato é a data
 * prevista de agendamento — é essa que vai para o novo registro), prazo e
 * representante. tipo_acao é resolvido depois por nome (beneficio), mesma
 * equivalência do hook existente; sem match, fica vazio.
 * Incertas — ficam em branco: origem, parceiro, responsavel.
 * Nascem em branco por regra do usuário: nautos (Nº do Processo), valor
 * (Valor da Causa) e dcontrato (Data do Contrato — preenchidos em Protocolo
 * na etapa do cálculo).
 */
export function buildProtocoloPrefill(c: any): AbrirEmProtocoloPrefill {
  return {
    contratoId: c.id,
    nome: c.nome || '',
    fone: c.fone || '',
    tipo_acao_nome: c.beneficio || '',
    status: 'Prov. Inicial',
    dprotocolo: toYMD(c.dprotocolo) || '',
    dcontrato: '',
    dcalculo: '',
    valor: undefined,
    nautos: '',
  }
}

/** Consulta os protocolos pelo ID exato do contrato (relation `contratos`). */
export async function consultarProtocolosDoContrato(contratoId: string): Promise<any[]> {
  const res = await pb.collection('protocolo').getFullList({
    filter: pb.filter('contratos = {:id}', { id: contratoId }),
    sort: '-created',
  })
  return res as any[]
}

/** Formata data (ISO/ymd) para exibição DD/MM/AAAA. */
export function formatDateBR(d?: string): string {
  if (!d) return ''
  const ymd = String(d).split(' ')[0].split('T')[0]
  const [y, m, day] = ymd.split('-')
  if (!y || !m || !day) return ''
  return `${day}/${m}/${y}`
}
