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
  origem: string
}

/**
 * Equivalências confirmadas: nome, fone, dprotocolo, dcontrato, dcalculo
 * (datas registradas no contrato; sem a data, fica em branco) e tipo_acao,
 * resolvido depois por nome (beneficio), mesma equivalência do hook existente;
 * sem match, fica vazio. status nasce 'Prov. Inicial'.
 * origem: mapeada de origem/campanha_origem/beneficio do contrato —
 *  - Particular → Particular
 *  - Macohin → Macohin (a campanha de origem fica só no contrato)
 *  - Campanha + "Aux. Acidente META"/"Aux. Acidente Google" → Campanha
 *    Meta/Google SOMENTE com beneficio Aux. Acidente (campanha_origem não é
 *    confiável para BPC/LOAS e Aux. Doença)
 *  - Campanha + "DER Google" → Campanha Google (sem condição de benefício)
 *  - Campanha + "DER Canal" → em branco (equivalência a Canal YouTube não
 *    confirmada); combinações desconhecidas → em branco p/ seleção manual.
 * Incertas — ficam em branco: parceiro, responsavel (escolhido no
 * agendamento), nautos (Nº do Processo) e valor (Valor da Causa).
 */
export function buildProtocoloPrefill(c: any): AbrirEmProtocoloPrefill {
  let origem = ''
  const campanha = (c.campanha_origem || '').trim()
  if (c.origem === 'Particular') {
    origem = 'Particular'
  } else if (c.origem === 'Macohin') {
    origem = 'Macohin'
  } else if (c.origem === 'Campanha' && campanha) {
    const benefAuxAcidente = (c.beneficio || '') === 'Aux. Acidente'
    if (campanha === 'Aux. Acidente META' && benefAuxAcidente) origem = 'Campanha Meta'
    else if (campanha === 'Aux. Acidente Google' && benefAuxAcidente) origem = 'Campanha Google'
    else if (campanha === 'DER Google') origem = 'Campanha Google'
    // "DER Canal" e combinações desconhecidas: fica em branco p/ seleção manual
  }

  const toInputDate = (v: any) => toYMD(v).split('T')[0]
  return {
    contratoId: c.id,
    nome: c.nome || '',
    fone: c.fone || '',
    tipo_acao_nome: c.beneficio || '',
    status: 'Prov. Inicial',
    dprotocolo: toInputDate(c.dprotocolo),
    dcontrato: toInputDate(c.dcontrato),
    dcalculo: toInputDate(c.dcalculo),
    valor: undefined,
    nautos: '',
    origem,
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
