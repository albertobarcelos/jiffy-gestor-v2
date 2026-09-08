import { ymdNoFuso, zonedTimeToUtc } from '@/src/shared/utils/periodoNoFusoEmpresa'

/** Flow: o turno atravessa a meia-noite até esta hora do dia seguinte. */
export const HORA_CORTE_DIA_OPERACIONAL_FLOW = 4

type Ymd = { year: number; month: number; day: number }

function horaNoFuso(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const raw = Number(parts.find(p => p.type === 'hour')?.value)
  if (!Number.isFinite(raw)) return date.getHours()
  return raw === 24 ? 0 : raw
}

function addDiasYmd(ymd: Ymd, dias: number, timeZone: string): Ymd {
  const noon = zonedTimeToUtc(
    { year: ymd.year, month: ymd.month, day: ymd.day, hour: 12, minute: 0 },
    timeZone
  )
  return ymdNoFuso(new Date(noon.getTime() + dias * 86_400_000), timeZone)
}

function instanteNoFuso(ymd: Ymd, hour: number, minute: number, timeZone: string): Date {
  return zonedTimeToUtc(
    {
      year: ymd.year,
      month: ymd.month,
      day: ymd.day,
      hour,
      minute,
      second: 0,
      millisecond: 0,
    },
    timeZone
  )
}

/** Data civil do turno: antes das 04:00 ainda é o dia anterior. */
export function ymdOperacionalKanban(
  agora: Date,
  timeZone: string,
  corteHora: number = HORA_CORTE_DIA_OPERACIONAL_FLOW
): Ymd {
  const tz = timeZone.trim() || 'America/Sao_Paulo'
  const ymd = ymdNoFuso(agora, tz)
  if (horaNoFuso(agora, tz) < corteHora) {
    return addDiasYmd(ymd, -1, tz)
  }
  return ymd
}

export function intervaloDiaOperacionalKanban(
  preset: 'hoje' | 'ontem',
  timeZone: string,
  agora: Date = new Date(),
  corteHora: number = HORA_CORTE_DIA_OPERACIONAL_FLOW
): { inicio: Date; fim: Date } {
  const tz = timeZone.trim() || 'America/Sao_Paulo'
  const operacional = ymdOperacionalKanban(agora, tz, corteHora)
  const dia = preset === 'ontem' ? addDiasYmd(operacional, -1, tz) : operacional
  const seguinte = addDiasYmd(dia, 1, tz)
  return {
    inicio: instanteNoFuso(dia, 0, 0, tz),
    fim: instanteNoFuso(seguinte, corteHora, 0, tz),
  }
}
