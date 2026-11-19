import pb from '@/lib/pocketbase/client'
import { toYMD } from '@/services/contratos'

export const ABRIR_PROTOCOLO_REGISTRO_KEY = 'abrir_protocolo_registro'
export const ABRIR_PROTOCOLO_PREFILL_KEY = 'abrir_protocolo_prefill'

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

/**
 * Lê e CONSUME a entrada da ação "Abrir em Protocolo" gravada pelo
 * ContractsTable antes de navegar para /protocolo. Retorna exatamente uma vez:
 * 'registro' → abrir registro existente; 'prefill' → novo registro
 * pré-preenchido (nada é gravado sem confirmação do usuário).
 */
export function loadAbrirEmProtocoloEntry():
  | { kind: 'registro'; id: string }
  | { kind: 'prefill'; prefill: AbrirEmProtocoloPrefill }
  | null {
  try {
    const raw = sessionStorage.getItem(ABRIR_PROTOCOLO_REGISTRO_KEY)
    if (raw) {
      sessionStorage.removeItem(ABRIR_PROTOCOLO_REGISTRO_KEY)
      const parsed = JSON.parse(raw)
      if (parsed?.id) return { kind: 'registro', id: String(parsed.id) }
    }
    const rawPre = sessionStorage.getItem(ABRIR_PROTOCOLO_PREFILL_KEY)
    if (rawPre) {
      sessionStorage.removeItem(ABRIR_PROTOCOLO_PREFILL_KEY)
      const parsed = JSON.parse(rawPre)
      if (parsed?.contratoId) return { kind: 'prefill', prefill: parsed }
    }
  } catch {
    /* sessionStorage indisponível ou JSON inválido — segue sem entrada */
  }
  return null
}

/** Grava a entrada "abrir registro existente" para a página de Protocolo. */
export function salvarAbrirProtocoloRegistro(id: string) {
  try {
    sessionStorage.setItem(ABRIR_PROTOCOLO_REGISTRO_KEY, JSON.stringify({ id }))
  } catch {
    /* sessionStorage indisponível — segue sem entrada */
  }
}

/** Grava a entrada "novo registro pré-preenchido" para a página de Protocolo. */
export function salvarAbrirProtocoloPrefill(prefill: AbrirEmProtocoloPrefill) {
  try {
    sessionStorage.setItem(ABRIR_PROTOCOLO_PREFILL_KEY, JSON.stringify(prefill))
  } catch {
    /* sessionStorage indisponível — segue sem entrada */
  }
}

/** Formata data (ISO/ymd) para exibição DD/MM/AAAA. */
export function formatDateBR(d?: string): string {
  if (!d) return ''
  const ymd = String(d).split(' ')[0].split('T')[0]
  const [y, m, day] = ymd.split('-')
  if (!y || !m || !day) return ''
  return `${day}/${m}/${y}`
}
