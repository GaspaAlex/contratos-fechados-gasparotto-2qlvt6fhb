export const formatCurrency = (value: number | undefined | null): string => {
  if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export const formatMinutesToHHMM = (mins: number | undefined | null): string => {
  if (typeof mins !== 'number' || isNaN(mins)) return '00:00'
  const isNeg = mins < 0
  const absMins = Math.abs(mins)
  const h = Math.floor(absMins / 60)
  const m = Math.round(absMins % 60)
  const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  return isNeg ? `-${formatted}` : formatted
}
