import type { DateRange } from 'react-day-picker'

/**
 * Junta intervalo do calendário + horas (equivalente ao fluxo do DateTimeRangePicker / modal do dashboard).
 */
export function combinarIntervaloCalendarParaDatas(
  range: DateRange | undefined,
  horaInicio: string,
  horaFim: string
): { dataInicial: Date | null; dataFinal: Date | null } {
  if (!range?.from || !range?.to) return { dataInicial: null, dataFinal: null }
  const parseTime = (s: string): { hours: number; minutes: number } | null => {
    if (!s || !s.trim()) return null
    const [hRaw, mRaw] = s.split(':')
    const hours = Number(hRaw)
    const minutes = Number(mRaw)
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
    return { hours, minutes }
  }
  const dataInicial = new Date(
    range.from.getFullYear(),
    range.from.getMonth(),
    range.from.getDate(),
    0,
    0,
    0,
    0
  )
  const dataFinal = new Date(
    range.to.getFullYear(),
    range.to.getMonth(),
    range.to.getDate(),
    0,
    0,
    0,
    0
  )
  const hi = parseTime(horaInicio)
  const hf = parseTime(horaFim)
  if (hi) {
    dataInicial.setHours(hi.hours, hi.minutes, 0, 0)
  } else {
    dataInicial.setHours(0, 0, 0, 0)
  }
  if (hf) {
    dataFinal.setHours(hf.hours, hf.minutes, 0, 0)
  } else {
    dataFinal.setHours(23, 59, 59, 999)
  }
  return { dataInicial, dataFinal }
}

/** Resumo curto de data/hora para o item “Por datas” no select e prévia do modal. */
export function formatarDataHoraIntervaloCurta(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
