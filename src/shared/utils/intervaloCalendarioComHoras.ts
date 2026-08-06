import type { DateRange } from 'react-day-picker'

export type HoraHhMm = { hours: number; minutes: number }

/** Interpreta `HH:mm` (ou `HH:mm:ss`); inválido → null. */
export function parseHoraHhMm(s: string): HoraHhMm | null {
  if (!s || !s.trim()) return null
  const [hRaw, mRaw] = s.split(':')
  const hours = Number(hRaw)
  const minutes = Number(mRaw)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}

/**
 * Junta intervalo do calendário + horas (equivalente ao fluxo do DateTimeRangePicker / modal do dashboard).
 */
export function combinarIntervaloCalendarParaDatas(
  range: DateRange | undefined,
  horaInicio: string,
  horaFim: string
): { dataInicial: Date | null; dataFinal: Date | null } {
  if (!range?.from || !range?.to) return { dataInicial: null, dataFinal: null }

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
  const hi = parseHoraHhMm(horaInicio)
  const hf = parseHoraHhMm(horaFim)
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

/**
 * Intervalo aplicável: datas completas e instante inicial ≤ final
 * (ex.: mesmo dia com hora fim menor que início é inválido).
 */
export function intervaloPersonalizadoEhValido(
  range: DateRange | undefined,
  horaInicio: string,
  horaFim: string
): boolean {
  const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
    range,
    horaInicio,
    horaFim
  )
  if (!dataInicial || !dataFinal) return false
  return dataInicial.getTime() <= dataFinal.getTime()
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

/** Resumo do intervalo: no mesmo dia evita repetir a data. */
export function formatarResumoPeriodoSelecionado(
  dataInicial: Date,
  dataFinal: Date
): string {
  const mesmaDataCivil =
    dataInicial.getFullYear() === dataFinal.getFullYear() &&
    dataInicial.getMonth() === dataFinal.getMonth() &&
    dataInicial.getDate() === dataFinal.getDate()

  const data = (d: Date) =>
    d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  const hora = (d: Date) =>
    d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

  if (mesmaDataCivil) {
    return `${data(dataInicial)} · ${hora(dataInicial)} — ${hora(dataFinal)}`
  }
  return `${formatarDataHoraIntervaloCurta(dataInicial)} — ${formatarDataHoraIntervaloCurta(dataFinal)}`
}
