/**
 * LABELS E HELPERS DA ÁREA DE GESTÃO DE COMISSÕES (Build F2-A)
 * ============================================================
 * Fonte única dos rótulos da interface de gestão — evita duplicação entre
 * o painel de colaboradores e o de metas.
 */
import type { ModalidadeComissao } from '@/lib/comissoesColaboradores'

export const MESES_NOMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const

/** "2026-11" → "nov/2026" (completo=true → "novembro/2026"). */
export function rotuloCompetencia(competencia: string, completo = false): string {
  const [anoTxt, mesTxt] = competencia.split('-')
  const idx = parseInt(mesTxt, 10) - 1
  const nome = MESES_NOMES[idx]
  if (!nome) return competencia
  return completo
    ? `${MESES_NOMES[idx].toLowerCase()}/${anoTxt}`
    : `${nome.toLowerCase()}/${anoTxt}`
}

export const MODALIDADE_LABELS: Record<ModalidadeComissao, string> = {
  fixa: 'Fixa',
  condicionada_meta: 'Condicionada à meta',
}

export const MODALIDADE_OPTIONS: { value: ModalidadeComissao; label: string }[] = [
  { value: 'fixa', label: 'Fixa' },
  { value: 'condicionada_meta', label: 'Condicionada à meta' },
]

/** "2026-11-01" → "01/11/2026"; aceita ISO completo ou AAAA-MM-DD. */
export function dataCurtaBR(valor?: string | null): string {
  if (!valor) return '—'
  const data = String(valor).split(' ')[0].split('T')[0]
  const [ano, mes, dia] = data.split('-')
  if (!ano || !mes || !dia) return valor
  return `${dia}/${mes}/${ano}`
}
