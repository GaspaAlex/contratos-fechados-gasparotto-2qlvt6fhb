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

export function getMonthsInRange(startMonth: string, endMonth: string): string[] {
  if (!startMonth || !endMonth) return []
  const startIndex = MONTHS.indexOf(startMonth)
  const endIndex = MONTHS.indexOf(endMonth)
  if (startIndex === -1 || endIndex === -1) return []
  const min = Math.min(startIndex, endIndex)
  const max = Math.max(startIndex, endIndex)
  return MONTHS.slice(min, max + 1)
}

export function getDisplayMonths(month: string, startMonth: string, endMonth: string): string[] {
  if (startMonth && endMonth) {
    return getMonthsInRange(startMonth, endMonth)
  }
  return month === 'Todos' ? MONTHS : [month]
}

export function isDateInPeriod(
  dateStr: string,
  month: string,
  day: string,
  year: string | number,
  startMonth: string,
  endMonth: string,
) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const dYear = String(d.getUTCFullYear())
  const dMonthNum = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dDay = d.getUTCDate()

  if (dYear !== String(year)) return false

  const monthToNum = (m: string) => {
    const idx = MONTHS.indexOf(m)
    return idx >= 0 ? String(idx + 1).padStart(2, '0') : m
  }

  if (startMonth && endMonth) {
    const sNum = monthToNum(startMonth)
    const eNum = monthToNum(endMonth)
    return dMonthNum >= sNum && dMonthNum <= eNum
  }

  if (month !== 'Todos') {
    const mNum = monthToNum(month)
    if (dMonthNum !== mNum) return false
    if (day !== 'Todos' && dDay !== parseInt(day)) return false
  }

  return true
}

export function isAfterMay2026(mesStr: string, defaultYear: number | string): boolean {
  if (!mesStr) return false
  let y = Number(defaultYear) || 2026
  const match = mesStr.match(/\d{4}/)
  if (match) {
    y = Number(match[0])
  }
  const mIndex = MONTHS.findIndex((m) => mesStr.startsWith(m))
  if (y > 2026) return true
  if (y < 2026) return false
  return mIndex >= 4 // Maio (index 4) and onwards
}

export function filterLeadsByPeriod(
  leads: any[],
  month: string,
  day: string,
  startMonth: string,
  endMonth: string,
): any[] {
  if (startMonth && endMonth) {
    const range = getMonthsInRange(startMonth, endMonth)
    return leads.filter((l) => range.some((m) => l.mes.startsWith(m)))
  }

  let filtered = month === 'Todos' ? leads : leads.filter((l: any) => l.mes.startsWith(month))
  if (month !== 'Todos' && day !== 'Todos') {
    filtered = filtered.filter((l: any) => l.dia === parseInt(day))
  }
  return filtered
}

export function calculateLeadRow(raw: any) {
  const v = (k: string) => Number(raw[k] || 0)

  let google = v('google')
  let meta_ads = v('meta_ads')
  let particular = v('particular')

  let em_qualif = v('em_qualif')
  let sem_qualidade = v('sem_qualidade')
  let aposentado = v('aposentado')
  let contribuinte_carne = v('contribuinte_carne')
  let outros = v('outros')
  let sem_interesse = v('sem_interesse')
  let engano = v('engano')

  let total_leads = google + meta_ads

  const fechado_direto = v('fechado_direto')
  const fechado_fup = v('fechado_fup'),
    fup_ativo = v('fup_ativo')
  const investimento = v('investimento')

  const denom_leads = total_leads > 0 ? total_leads : 0
  const total_desq =
    sem_qualidade + aposentado + contribuinte_carne + outros + sem_interesse + engano
  const qualificados = total_leads - em_qualif - total_desq
  const total_fechados = fechado_direto + fechado_fup

  return {
    google,
    meta_ads,
    particular,
    em_qualif,
    sem_qualidade,
    aposentado,
    contribuinte_carne,
    outros,
    sem_interesse,
    engano,
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

export function aggregateLeads(leads: any[], year?: string | number, campaign: string = 'Todas') {
  const result = leads.reduce(
    (acc: any, l: any) => {
      const isSpecificCampaign = campaign && campaign !== 'Todas' && campaign !== 'all'
      const campaignKey = isSpecificCampaign ? campaign.replace(/^meta_/, '') : campaign
      if (isSpecificCampaign) {
        acc.meta_ads += Number(l[`meta_${campaignKey}`]) || 0
        acc.em_qualif += Number(l[`qualif_${campaignKey}`]) || 0
        acc.sem_qualidade += Number(l[`sem_qualidade_${campaignKey}`]) || 0
        acc.aposentado += Number(l[`aposentado_${campaignKey}`]) || 0
        acc.contribuinte_carne += Number(l[`carne_${campaignKey}`]) || 0
        acc.outros += Number(l[`outros_${campaignKey}`]) || 0
        acc.sem_interesse += Number(l[`sem_interesse_${campaignKey}`]) || 0
        acc.engano += Number(l[`engano_${campaignKey}`]) || 0

        acc.google += 0
        acc.particular += 0
        acc.fechado_direto += 0
        acc.fechado_fup += 0
        acc.fup_ativo += 0
        acc.investimento += Number(l.investimento) || 0
      } else {
        acc.google += l.google || 0
        acc.meta_ads += l.meta_ads || 0
        acc.particular += l.particular || 0
        acc.em_qualif += l.em_qualif || 0

        const isModern = isAfterMay2026(l.mes, year || 2026)

        if (isModern) {
          acc.sem_qualidade +=
            (l.sem_qualidade_c1 || 0) +
            (l.sem_qualidade_c2 || 0) +
            (l.sem_qualidade_c3 || 0) +
            (l.sem_qualidade_c4 || 0) +
            (l.sem_qualidade_c5 || 0)
          acc.aposentado +=
            (l.aposentado_c1 || 0) +
            (l.aposentado_c2 || 0) +
            (l.aposentado_c3 || 0) +
            (l.aposentado_c4 || 0) +
            (l.aposentado_c5 || 0)
          acc.contribuinte_carne +=
            (l.carne_c1 || 0) +
            (l.carne_c2 || 0) +
            (l.carne_c3 || 0) +
            (l.carne_c4 || 0) +
            (l.carne_c5 || 0)
          acc.outros +=
            (l.outros_c1 || 0) +
            (l.outros_c2 || 0) +
            (l.outros_c3 || 0) +
            (l.outros_c4 || 0) +
            (l.outros_c5 || 0)
          acc.sem_interesse +=
            (l.sem_interesse_c1 || 0) +
            (l.sem_interesse_c2 || 0) +
            (l.sem_interesse_c3 || 0) +
            (l.sem_interesse_c4 || 0) +
            (l.sem_interesse_c5 || 0)
          acc.engano +=
            (l.engano_c1 || 0) +
            (l.engano_c2 || 0) +
            (l.engano_c3 || 0) +
            (l.engano_c4 || 0) +
            (l.engano_c5 || 0)
        } else {
          acc.sem_qualidade += l.sem_qualidade || 0
          acc.aposentado += l.aposentado || 0
          acc.contribuinte_carne += l.contribuinte_carne || 0
          acc.outros += l.outros || 0
          acc.sem_interesse += l.sem_interesse || 0
          acc.engano += l.engano || 0
        }

        acc.fechado_direto += l.fechado_direto || 0
        acc.fechado_fup += l.fechado_fup || 0
        acc.fup_ativo += l.fup_ativo || 0
        acc.investimento += l.investimento || 0
      }
      return acc
    },
    {
      google: 0,
      meta_ads: 0,
      particular: 0,
      em_qualif: 0,
      sem_qualidade: 0,
      aposentado: 0,
      contribuinte_carne: 0,
      outros: 0,
      sem_interesse: 0,
      engano: 0,
      fechado_direto: 0,
      fechado_fup: 0,
      fup_ativo: 0,
      investimento: 0,
    } as any,
  )

  return result
}

export const fmtPct = (v: number | null) => (v !== null ? `${(v * 100).toFixed(1)}%` : '—')
export const fmtMon = (v: number | null) => (v !== null ? `R$ ${v.toFixed(2)}` : '—')

export const colorConvGeral = (v: number | null) =>
  v === null ? '' : v >= 0.06 ? 'text-green-600' : 'text-red-600'
export const colorConvQualif = (v: number | null) =>
  v === null ? '' : v >= 0.1 ? 'text-green-600' : 'text-red-600'
export const colorDesq = (v: number | null) =>
  v === null ? '' : v <= 0.3 ? 'text-green-600' : 'text-red-600'
export const colorFechFup = (v: number | null) =>
  v === null ? '' : v >= 0.4 ? 'text-green-600' : 'text-red-600'
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
