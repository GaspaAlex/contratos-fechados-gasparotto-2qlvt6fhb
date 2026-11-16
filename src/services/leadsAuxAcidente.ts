import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import { isArchived } from '@/lib/archivedStatuses'

export type StatusFunil = 'qualificando' | 'qualificado' | 'desqualificado'
export type OrigemLead = 'enlead' | 'campanha'
export type Responsivo = 'sim' | 'nao' | ''

export interface ContratoFechadoResumo {
  id: string
  nome: string
  fone: string
  beneficio: string
  dcontrato: string
  status: string
  origem: string
  campanha_origem: string
}

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
    /** Contratos reais da relation (getLeadsAux usa expand: 'contratos'). */
    contratos?: ContratoFechadoResumo[]
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
    expand: 'responsavel,contratos',
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

/* ------------------------------------------------------------------ */
/* Vínculo manual com contratos_fechados                               */
/* (relation armazenada SOMENTE em leads_aux_acidente.contratos;       */
/*  contratos_fechados nunca é alterado)                               */
/* ------------------------------------------------------------------ */

/**
 * CONTRATO VÁLIDO (indicadores da Central Auxílio-Acidente):
 * relation `contratos` do lead + beneficio === 'Aux. Acidente' (valor exato,
 * mesma regra do hook de vínculo automático) + status NÃO arquivado
 * (fonte única: isArchived() de src/lib/archivedStatuses.ts).
 * A relation é HISTÓRICO — contratos inválidos/arquivados/órfãos não são
 * removidos dela, apenas deixam de contar nos indicadores.
 */
export function isContratoValidoAuxAcidente(
  contrato?: Partial<ContratoFechadoResumo> | null,
): boolean {
  if (!contrato) return false
  return contrato.beneficio === 'Aux. Acidente' && !isArchived(contrato.status)
}

const toResumo = (rec: RecordModel): ContratoFechadoResumo => ({
  id: rec.id,
  nome: (rec.nome as string) || '',
  fone: (rec.fone as string) || '',
  beneficio: (rec.beneficio as string) || '',
  dcontrato: (rec.dcontrato as string) || '',
  status: (rec.status as string) || '',
  origem: (rec.origem as string) || '',
  campanha_origem: (rec.campanha_origem as string) || '',
})

/**
 * Busca contratos por telefone (comparação por dígitos, ignorando máscara)
 * e/ou por nome (substring normalizada, sem acento/caixa).
 * Campos inexistentes nunca são consultados — `fone` e `nome` existem
 * em contratos_fechados; se um contrato não tiver valor, é ignorado.
 */
export async function buscarContratosParaVinculo(params: {
  telefone?: string
  nome?: string
}): Promise<ContratoFechadoResumo[]> {
  const { telefone = '', nome = '' } = params
  const telDigits = normalizePhoneDigits(telefone)
  const nomeNorm = nome.trim()

  const filters: string[] = []
  if (telDigits) filters.push(pb.filter('fone ~ {:tel}', { tel: telDigits }))
  if (nomeNorm) filters.push(pb.filter('nome ~ {:nome}', { nome: nomeNorm }))
  if (!filters.length) return []

  const result = await pb
    .collection('contratos_fechados')
    .getList<RecordModel>(1, 100, { filter: filters.join(' || '), sort: '-created' })

  const items = result.items

  // Filtragem final: telefone comparado por dígitos (cobre máscaras variadas)
  return items
    .filter((rec) => {
      if (telDigits && normalizePhoneDigits((rec.fone as string) || '') !== telDigits) {
        // quando a busca também é por nome, mantém matches de nome
        return Boolean(nomeNorm)
      }
      return true
    })
    .map(toResumo)
}

/** Busca sugestões apenas pelo telefone normalizado do lead. */
export const buscarContratosPorTelefone = (telefone: string) =>
  buscarContratosParaVinculo({ telefone })

/** Busca contratos por lista de IDs (para resolver a relation atual). */
export async function getContratosByIds(ids: string[]): Promise<ContratoFechadoResumo[]> {
  if (!ids.length) return []
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))

  const all: ContratoFechadoResumo[] = []
  for (const chunk of chunks) {
    const result = await pb.collection('contratos_fechados').getList<RecordModel>(1, chunk.length, {
      filter: chunk.map((id) => `id = '${id.replace(/'/g, "\\'")}'`).join(' || '),
      sort: '-created',
    })
    for (const rec of result.items) all.push(toResumo(rec))
  }
  // Preserva a ordem em que os IDs aparecem na relation
  const byId = new Map(all.map((c) => [c.id, c]))
  return ids.map((id) => byId.get(id)).filter((c): c is ContratoFechadoResumo => Boolean(c))
}

/**
 * Regra de promoção do funil no vínculo (manual ou automático) de contrato,
 * IDÊNTICA à do hook server-side `leads_aux_acidente_vinculo.js` (regra
 * revisada: o contrato válido PREVALECE sobre a desqualificação anterior):
 *  - 'qualificando'   → promove para 'qualificado' e, se `qualificado_em`
 *    estiver vazio, preenche com data/hora atual;
 *  - 'qualificado'    → mantém (não sobrescreve `qualificado_em`);
 *  - 'desqualificado' → promove para 'qualificado' e LIMPA
 *    `motivo_desqualificacao` e `motivo_desqualificacao_outro`;
 *    `qualificado_em` preenchido se vazio.
 * Nunca cria status "Contrato Fechado" — a relation `contratos` é a fonte
 * de verdade da conversão. Campos como telefone, responsável, origem,
 * responsivo e observações nunca são enviados no update.
 */
export function computePromocaoFunil(
  statusFunil: string | undefined,
  qualificadoEm?: string,
): {
  status_funil?: StatusFunil
  qualificado_em?: string
  motivo_desqualificacao?: string
  motivo_desqualificacao_outro?: string
} {
  const status = (statusFunil || '').trim()
  if (status === 'qualificando' || status === 'desqualificado') {
    const payload: {
      status_funil?: StatusFunil
      qualificado_em?: string
      motivo_desqualificacao?: string
      motivo_desqualificacao_outro?: string
    } = {
      status_funil: 'qualificado',
    }
    if (!qualificadoEm) payload.qualificado_em = new Date().toISOString()
    if (status === 'desqualificado') {
      payload.motivo_desqualificacao = ''
      payload.motivo_desqualificacao_outro = ''
    }
    return payload
  }
  // 'qualificado' (e qualquer status inesperado): nada a fazer
  return {}
}

/**
 * Salva a relation `contratos` do lead, aplicando no MESMO update a regra de
 * promoção do funil (qualificando → qualificado). O lead é recarregado fresco
 * do banco antes de salvar, para nunca aplicar a regra sobre objeto obsoleto.
 * Sobrescreve o campo com a lista completa de IDs informada — vínculo
 * definitivo só após confirmação do usuário.
 */
export async function setLeadContratos(
  leadId: string,
  contratoIds: string[],
): Promise<LeadAuxAcidente> {
  // Recarrega o lead atual do banco — não usa o objeto passado pela UI.
  const lead = await pb.collection('leads_aux_acidente').getOne<LeadAuxAcidente>(leadId)
  return pb.collection('leads_aux_acidente').update<LeadAuxAcidente>(leadId, {
    contratos: contratoIds,
    ...computePromocaoFunil(lead.status_funil, lead.qualificado_em),
  })
}
