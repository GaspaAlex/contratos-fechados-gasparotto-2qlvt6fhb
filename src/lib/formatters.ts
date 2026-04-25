export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export const formatMinutesToHHMM = (totalMinutes: number | undefined | null) => {
  if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) return '00:00'
  const sign = totalMinutes < 0 ? '-' : ''
  const absMinutes = Math.abs(Math.round(totalMinutes))
  const hours = Math.floor(absMinutes / 60)
  const minutes = absMinutes % 60
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}
