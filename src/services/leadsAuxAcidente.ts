import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type StatusFunil = 'qualificando' | 'qualificado' | 'desqualificado'
export type OrigemLead = 'enlead' | 'campanha'
export type Responsivo = 'sim' | 'nao' | ''

export interface LeadAuxAcidente extends RecordModel {
  data_entrada: string
  telefone: string
  origem_lead: OrigemLead
  nome?: string
  responsavel?: string | string[] | null
  responsivo?: Responsivo
  respondido_em?: string
  status_funil: StatusFunil
  motivo_desqualificacao?: string
  motivo_desqualificacao_outro?: string
  qualificado_em?: string
  desqualificado_em?: string
  observacoes?: string
  contratos?: string[]
  expand?: {
    responsavel?: { id: string; nome: string }
  }
  created?: string
  updated?: string
}

export const ORIGEM_OPTIONS = [
  { value: 'enlead', label: 'Enlead' },
  { value: 'campanha', label: 'Campanha' },
] as const

export const ORIGEM_LABELS: Record<string, string> = {
  enlead: 'Enlead',
  campanha: 'Campanha',
}

export const STATUS_OPTIONS = [
  { value: 'qualificando', label: 'Qualificando' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'desqualificado', label: 'Desqualificado' },
] as const

export const STATUS_FUNIL_LABELS: Record<string, string> = {
  qualificando: 'Qualificando',
  qualificado: 'Qualificado',
  desqualificado: 'Desqualificado',
}

export const RESPONSIVO_OPTIONS = [
  { value: 'nao', label: 'Não' },
  { value: 'sim', label: 'Sim' },
] as const

export const MOTIVO_DESQUALIFICACAO_OPTIONS = [
  { value: 'sem_qualidade', label: 'Sem qualidade' },
  { value: 'aposentado', label: 'Aposentado' },
  { value: 'contribuinte_carne', label: 'Contribuinte carnê' },
  { value: 'sem_interesse', label: 'Sem interesse' },
  { value: 'recebe_auxilio_doenca', label: 'Recebe auxílio-doença' },
  { value: 'nao_sofreu_acidente', label: 'Não sofreu acidente' },
  { value: 'servidor_publico', label: 'Servidor público' },
  { value: 'engano', label: 'Engano' },
  { value: 'possui_advogado', label: 'Possui advogado' },
  { value: 'recebe_auxilio_acidente', label: 'Recebe auxílio-acidente' },
  { value: 'outros', label: 'Outros' },
] as const

export function motivoLabel(value?: string): string {
  if (!value) return ''
  const found = MOTIVO_DESQUALIFICACAO_OPTIONS.find((o) => o.value === value)
  return found ? found.label : value
}

/** Máscara visual de telefone (padrão do LeadsRegistroModal), sem alterar o valor salvo. */
export function formatPhoneMask(value: string): string {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')
  const truncated = numbers.slice(0, 11)

  if (truncated.length === 0) return ''
  if (truncated.length <= 2) return `(${truncated}`
  if (truncated.length <= 7) return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`
  return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`
}

/** Normaliza para apenas dígitos antes de salvar. */
export function normalizePhoneDigits(value: string): string {
  return (value || '').replace(/\D/g, '')
}

/** Data de hoje no fuso local, como 'YYYY-MM-DD'. */
export function getTodayYMDLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 'YYYY-MM-DD' (tolerante a hora) → 'DD/MM/AAAA'. */
export function formatDateBR(value?: string): string {
  if (!value) return '—'
  const datePart = String(value).split(' ')[0].split('T')[0]
  const [y, m, d] = datePart.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

/** ID do responsável expandido ou cru. */
export function responsavelId(lead: LeadAuxAcidente): string {
  const r = lead.responsavel
  if (!r) return ''
  if (Array.isArray(r)) return r[0] || ''
  return r
}

export function responsavelNome(lead: LeadAuxAcidente): string {
  if (lead.expand?.responsavel?.nome) return lead.expand.responsavel.nome
  return ''
}

export const getLeadsAux = () =>
  pb.collection('leads_aux_acidente').getFullList<LeadAuxAcidente>({
    sort: '-data_entrada,-created',
    expand: 'responsavel',
  })

export interface LeadAuxPayload {
  data_entrada: string
  telefone: string
  origem_lead: OrigemLead
  nome?: string
  responsavel?: string
  responsivo?: Responsivo
  status_funil: StatusFunil
  motivo_desqualificacao?: string
  motivo_desqualificacao_outro?: string
  observacoes?: string
}

export const createLeadAuxAcidente = (data: LeadAuxPayload) =>
  pb.collection('leads_aux_acidente').create<LeadAuxAcidente>(data)

/**
 * Busca leads com o mesmo telefone, ignorando diferenças de máscara.
 * O filtro do PocketBase busca por substring sem espaços (cobre "(11) 9" e "119"
 * independente do espaçamento); o resultado é normalizado por dígitos, cobrindo
 * também máscaras com hífen/pontos. `excludeId` remove o próprio registro
 * (usado na edição para não acusar falsa duplicidade).
 */
export async function findByTelefoneNormalized(
  telefone: string,
  excludeId?: string,
): Promise<LeadAuxAcidente[]> {
  const digits = normalizePhoneDigits(telefone)
  if (!digits) return []

  const filter = pb.filter('telefone ~ {:q}', { q: digits })
  const result = await pb
    .collection('leads_aux_acidente')
    .getList<LeadAuxAcidente>(1, 200, { filter, expand: 'responsavel' })

  return result.items.filter(
    (item) => item.id !== excludeId && normalizePhoneDigits(item.telefone) === digits,
  )
}

export const updateLeadAuxAcidente = (id: string, data: Partial<LeadAuxPayload>) =>
  pb.collection('leads_aux_acidente').update<LeadAuxAcidente>(id, data)

export const deleteLeadAux = (id: string) => pb.collection('leads_aux_acidente').delete(id)
