import type {
  IntervaloSlotMinutos,
  TurnoHorarioFuncionamentoDTO,
} from '@/src/application/dto/delivery/AgendamentoDeliveryDTO'

export type SlotPreview = {
  inicioLabel: string
  fimLabel: string
  label: string
}

function parseHm(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function formatHm(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function cruzaMeiaNoite(horaInicio: string, horaFim: string): boolean {
  return parseHm(horaFim) <= parseHm(horaInicio)
}

function civilDateInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function weekdayInTz(date: Date, timeZone: string): number {
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const key = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date)
  return map[key] ?? 0
}

function minutesNowInTz(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0') % 24
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

/**
 * Preview local dos slots do dia civil atual (anti-duplicata simplificada).
 * Espelha a regra do backend o suficiente para o gestor visualizar a grade.
 */
export function gerarSlotsPreviewHoje(input: {
  agora?: Date
  timezone: string
  turnos: TurnoHorarioFuncionamentoDTO[]
  intervaloMinutos: IntervaloSlotMinutos
  leadTimeMinutos: number
}): SlotPreview[] {
  const agora = input.agora ?? new Date()
  const timezone = input.timezone || 'America/Sao_Paulo'
  const hoje = civilDateInTz(agora, timezone)
  const weekday = weekdayInTz(agora, timezone)
  const weekdayPrev = (weekday + 6) % 7
  const minutosAgora = minutesNowInTz(agora, timezone)
  const minStart = minutosAgora + input.leadTimeMinutos

  const faixas: Array<{ start: number; end: number }> = []
  const ativos = input.turnos.filter(t => t.ativo)

  for (const turno of ativos) {
    if (turno.diaSemana === weekday) {
      const ini = parseHm(turno.horaInicio)
      if (!cruzaMeiaNoite(turno.horaInicio, turno.horaFim)) {
        faixas.push({ start: ini, end: parseHm(turno.horaFim) })
      } else {
        faixas.push({ start: ini, end: 24 * 60 })
      }
    }
    if (
      turno.diaSemana === weekdayPrev &&
      cruzaMeiaNoite(turno.horaInicio, turno.horaFim)
    ) {
      faixas.push({ start: 0, end: parseHm(turno.horaFim) })
    }
  }

  const slots: SlotPreview[] = []
  const intervalo = input.intervaloMinutos
  const inicioVisto = new Set<number>()

  for (const faixa of faixas) {
    let cursor = Math.ceil(faixa.start / intervalo) * intervalo
    if (cursor < faixa.start) cursor += intervalo

    while (cursor + intervalo <= faixa.end) {
      if (cursor >= minStart && !inicioVisto.has(cursor)) {
        inicioVisto.add(cursor)
        const inicioLabel = formatHm(cursor)
        const fimLabel = formatHm(cursor + intervalo)
        slots.push({
          inicioLabel,
          fimLabel,
          label: `${inicioLabel} – ${fimLabel}`,
        })
      }
      cursor += intervalo
    }
  }

  void hoje
  slots.sort((a, b) => parseHm(a.inicioLabel) - parseHm(b.inicioLabel))
  return slots
}
