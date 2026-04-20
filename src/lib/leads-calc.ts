import { useRef, useState } from 'react'

export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function calculateLeadRow(raw: any) {
  const v = (k: string) => Number(raw[k] || 0)
  const google = v('google'),
    meta_ads = v('meta_ads'),
    particular = v('particular'),
    meta = v('meta')
  const em_qualif = v('em_qualif'),
    sem_qualidade = v('sem_qualidade')
  const aposentado = v('aposentado'),
    contribuinte_carne = v('contribuinte_carne')
  const outros = v('outros'),
    fechado_direto = v('fechado_direto')
  const fechado_fup = v('fechado_fup'),
    fup_ativo = v('fup_ativo')
  const investimento = v('investimento')

  const total_leads = google + meta_ads + particular
  const denom_leads = total_leads > 0 ? total_leads : meta
  const total_desq = sem_qualidade + aposentado + contribuinte_carne + outros
  const qualificados = total_leads - em_qualif - total_desq
  const total_fechados = fechado_direto + fechado_fup

  return {
    google,
    particular,
    meta,
    em_qualif,
    sem_qualidade,
    aposentado,
    contribuinte_carne,
    outros,
    fechado_direto,
    fechado_fup,
    fup_ativo,
    investimento,
    observacoes: raw.observacoes || '',
    total_leads,
    total_desq,
    qualificados,
    total_fechados,
    conv_geral: denom_leads > 0 ? total_fechados / denom_leads : null,
    conv_qualif: qualificados > 0 ? total_fechados / qualificados : null,
    conv_fup_pct: fup_ativo > 0 ? fechado_fup / fup_ativo : null,
    pct_fech_via_fup: total_fechados > 0 ? fechado_fup / total_fechados : null,
    desqual_pct: denom_leads > 0 ? total_desq / denom_leads : null,
    cac: total_fechados > 0 ? investimento / total_fechados : null,
    cpl: denom_leads > 0 ? investimento / denom_leads : null,
  }
}

export function aggregateLeads(leads: any[]) {
  return leads.reduce(
    (acc, l) => {
      acc.meta += l.meta || 0
      acc.google += l.google || 0
      acc.meta_ads += l.meta_ads || 0
      acc.particular += l.particular || 0
      acc.em_qualif += l.em_qualif || 0
      acc.sem_qualidade += l.sem_qualidade || 0
      acc.aposentado += l.aposentado || 0
      acc.contribuinte_carne += l.contribuinte_carne || 0
      acc.outros += l.outros || 0
      acc.fechado_direto += l.fechado_direto || 0
      acc.fechado_fup += l.fechado_fup || 0
      acc.fup_ativo += l.fup_ativo || 0
      acc.investimento += l.investimento || 0
      return acc
    },
    {
      meta: 0,
      google: 0,
      meta_ads: 0,
      particular: 0,
      em_qualif: 0,
      sem_qualidade: 0,
      aposentado: 0,
      contribuinte_carne: 0,
      outros: 0,
      fechado_direto: 0,
      fechado_fup: 0,
      fup_ativo: 0,
      investimento: 0,
    },
  )
}

export const fmtPct = (v: number | null) => (v !== null ? `${(v * 100).toFixed(1)}%` : '—')
export const fmtMon = (v: number | null) => (v !== null ? `R$ ${v.toFixed(2)}` : '—')

export const colorConvGeral = (v: number | null) =>
  v === null ? '' : v >= 0.08 ? 'text-green-600' : v >= 0.06 ? 'text-amber-600' : 'text-red-600'
export const colorConvQualif = (v: number | null) =>
  v === null ? '' : v >= 0.12 ? 'text-green-600' : v >= 0.1 ? 'text-amber-600' : 'text-red-600'
export const colorDesq = (v: number | null) =>
  v === null ? '' : v <= 0.15 ? 'text-green-600' : v <= 0.3 ? 'text-amber-600' : 'text-red-600'
export const colorFechFup = (v: number | null) =>
  v === null ? '' : v >= 0.4 ? 'text-green-600' : v >= 0.2 ? 'text-amber-600' : 'text-red-600'
export const colorCac = (v: number | null) =>
  v === null ? '' : v <= 150 ? 'text-green-600' : v <= 250 ? 'text-amber-600' : 'text-red-600'

export function getCacStatus(v: number | null) {
  if (v === null || isNaN(v))
    return { text: '—', color: 'text-muted-foreground bg-muted/50 border-muted' }
  if (v <= 150)
    return { text: '✓ Meta atingida', color: 'text-green-800 bg-green-100 border-green-200' }
  if (v <= 250) return { text: '⚠ Atenção', color: 'text-amber-800 bg-amber-100 border-amber-200' }
  return { text: '✗ Acima do limite', color: 'text-red-800 bg-red-100 border-red-200' }
}

export function useDraggableScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return
    setIsDragging(true)
    setStartX(e.pageX - ref.current.offsetLeft)
    setScrollLeft(ref.current.scrollLeft)
  }
  const stop = () => setIsDragging(false)
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !ref.current) return
    e.preventDefault()
    const x = e.pageX - ref.current.offsetLeft
    ref.current.scrollLeft = scrollLeft - (x - startX) * 1.5
  }
  return {
    ref,
    onMouseDown,
    onMouseLeave: stop,
    onMouseUp: stop,
    onMouseMove,
    style: { cursor: isDragging ? 'grabbing' : 'grab' },
  }
}
