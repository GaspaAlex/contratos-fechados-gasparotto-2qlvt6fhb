export const timeToMinutes = (timeStr?: string | null): number => {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const calculateWorkedMinutes = (
  e1?: string,
  s1?: string,
  e2?: string,
  s2?: string,
): number => {
  let total = 0
  if (e1 && s1) total += Math.max(0, timeToMinutes(s1) - timeToMinutes(e1))
  if (e2 && s2) total += Math.max(0, timeToMinutes(s2) - timeToMinutes(e2))
  return total
}

export const calculateDailyBalance = (
  e1?: string,
  s1?: string,
  e2?: string,
  s2?: string,
  cargaMins: number = 480,
  tipoDia: string = 'normal',
  horasAtestadoMins: number = 0,
): { horas_trabalhadas: number; saldo_dia: number } => {
  const horas_trabalhadas = calculateWorkedMinutes(e1, s1, e2, s2)
  let saldo_dia = 0

  if (tipoDia === 'normal') {
    saldo_dia = horas_trabalhadas - cargaMins
  } else if (tipoDia === 'falta') {
    saldo_dia = -cargaMins
  } else if (tipoDia === 'feriado') {
    saldo_dia = horas_trabalhadas > 0 ? horas_trabalhadas : 0
  } else if (tipoDia === 'atestado') {
    if (horasAtestadoMins === 0 && horas_trabalhadas === 0) {
      saldo_dia = 0
    } else {
      saldo_dia = horas_trabalhadas + horasAtestadoMins - cargaMins
    }
  }

  return { horas_trabalhadas, saldo_dia }
}

export const formatBalance = (
  mins: number | undefined | null,
  formatMinutesFn: (m: number) => string,
) => {
  if (typeof mins !== 'number' || isNaN(mins)) return '00:00'
  const formatted = formatMinutesFn(mins)
  if (mins > 0) return `+${formatted}`
  return formatted // formatMinutesToHHMM already includes '-' for negative numbers
}
