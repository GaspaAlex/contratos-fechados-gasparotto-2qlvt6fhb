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
  recordDate?: Date | string,
): { horas_trabalhadas: number; saldo_dia: number; tipo_dia_sugerido?: string } => {
  const horas_trabalhadas = calculateWorkedMinutes(e1, s1, e2, s2)
  let saldo_dia = 0
  let tipo_dia_sugerido = tipoDia

  const isTodayOrFuture = () => {
    if (!recordDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(recordDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime() >= today.getTime()
  }

  const hasNoHours = !e1 && !s1 && !e2 && !s2

  if (tipoDia === 'normal') {
    if (hasNoHours) {
      if (isTodayOrFuture()) {
        saldo_dia = 0
      } else {
        saldo_dia = -cargaMins
        tipo_dia_sugerido = 'falta'
      }
    } else {
      saldo_dia = horas_trabalhadas - cargaMins
    }
  } else if (tipoDia === 'falta') {
    if (!hasNoHours) {
      tipo_dia_sugerido = 'normal'
      saldo_dia = horas_trabalhadas - cargaMins
    } else {
      saldo_dia = -cargaMins
    }
  } else if (tipoDia === 'feriado') {
    saldo_dia = 0
  } else if (tipoDia === 'atestado') {
    saldo_dia = 0
  } else if (tipoDia === 'fim_de_semana') {
    saldo_dia = horas_trabalhadas
  }

  return { horas_trabalhadas, saldo_dia, tipo_dia_sugerido }
}

export const formatBalance = (
  mins: number | undefined | null,
  formatMinutesFn: (m: number) => string,
) => {
  if (typeof mins !== 'number' || isNaN(mins)) return '00:00'
  const absMins = Math.abs(mins)
  let formatted = formatMinutesFn(absMins)
  if (formatted.startsWith('+') || formatted.startsWith('-')) {
    formatted = formatted.substring(1)
  }
  if (mins > 0) return `+${formatted}`
  if (mins < 0) return `-${formatted}`
  return formatted
}
