import type {
  HorarioFuncionamentoPublicoDTO,
  TurnoHorarioFuncionamentoPublicoDTO,
} from '@/src/application/dto/delivery-publico/HorarioFuncionamentoPublicoDTO'

const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

function weekdayInTz(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[weekday] ?? 0
}

function formatarFaixa(horaInicio: string, horaFim: string): string {
  return `${horaInicio} às ${horaFim}`
}

function formatarProximaAbertura(iso: string | null, timeZone: string): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

/**
 * Texto curto do header: horários de hoje no timezone da loja.
 * Fechado hoje → "Fechado hoje" (+ próxima abertura quando houver).
 * Sem turnos → "Horário não informado".
 */
export function formatarHorarioHoje(
  horario: Pick<HorarioFuncionamentoPublicoDTO, 'timezone' | 'turnos' | 'proximaAbertura'>,
  agora: Date = new Date()
): string {
  const { timezone, turnos, proximaAbertura } = horario
  if (!turnos.length) return 'Horário não informado'

  const diaHoje = weekdayInTz(agora, timezone)
  const turnosHoje = turnos
    .filter(t => t.diaSemana === diaHoje)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

  if (turnosHoje.length === 0) {
    const proxima = formatarProximaAbertura(proximaAbertura, timezone)
    return proxima ? `Fechado hoje · abre ${proxima}` : 'Fechado hoje'
  }

  const faixas = turnosHoje.map(t => formatarFaixa(t.horaInicio, t.horaFim)).join(' · ')
  return `Hoje ${faixas}`
}

/**
 * Grade semanal para o rodapé (apenas dias com turno).
 * Ex.: "Seg 11:00–14:30 · Seg 18:00–02:00 · Ter 11:00–22:00"
 */
export function formatarGradeSemanal(turnos: TurnoHorarioFuncionamentoPublicoDTO[]): string {
  if (!turnos.length) return 'Horário não informado'

  const ordenados = [...turnos].sort((a, b) => {
    if (a.diaSemana !== b.diaSemana) return a.diaSemana - b.diaSemana
    return a.horaInicio.localeCompare(b.horaInicio)
  })

  return ordenados
    .map(t => {
      const dia = DIAS_CURTO[t.diaSemana] ?? `D${t.diaSemana}`
      return `${dia} ${t.horaInicio}–${t.horaFim}`
    })
    .join(' · ')
}

/** Resolve campos de exibição da home a partir da API pública. */
export function resolverExibicaoHorarioHome(
  horario: HorarioFuncionamentoPublicoDTO | null | undefined,
  agora: Date = new Date()
): {
  disponivel: boolean
  horarioTexto: string
  horarioSemanalTexto: string
} {
  if (!horario) {
    return {
      disponivel: true,
      horarioTexto: 'Horário não informado',
      horarioSemanalTexto: 'Horário não informado',
    }
  }

  if (!horario.turnos.length) {
    return {
      disponivel: true,
      horarioTexto: 'Horário não informado',
      horarioSemanalTexto: 'Horário não informado',
    }
  }

  return {
    disponivel: horario.abertaAgora,
    horarioTexto: formatarHorarioHoje(horario, agora),
    horarioSemanalTexto: formatarGradeSemanal(horario.turnos),
  }
}
