import type { TurnoHorarioFuncionamentoDTO } from '@/src/application/dto/delivery/AgendamentoDeliveryDTO'

function parseHm(hora: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora)
  if (!match) return NaN
  return Number(match[1]) * 60 + Number(match[2])
}

function rangesDoDia(turno: TurnoHorarioFuncionamentoDTO): Array<{
  start: number
  end: number
}> {
  const ini = parseHm(turno.horaInicio)
  const fim = parseHm(turno.horaFim)
  if (Number.isNaN(ini) || Number.isNaN(fim)) return []
  if (fim > ini) return [{ start: ini, end: fim }]
  return [{ start: ini, end: 24 * 60 }]
}

export function validarTurnosAgendamento(
  turnos: TurnoHorarioFuncionamentoDTO[]
): string | null {
  for (const turno of turnos) {
    if (turno.diaSemana < 0 || turno.diaSemana > 6) {
      return 'Dia da semana inválido.'
    }
    if (
      Number.isNaN(parseHm(turno.horaInicio)) ||
      Number.isNaN(parseHm(turno.horaFim))
    ) {
      return 'Informe horários no formato HH:mm.'
    }
  }

  const ativos = turnos.filter(t => t.ativo)
  for (let i = 0; i < ativos.length; i++) {
    for (let j = i + 1; j < ativos.length; j++) {
      const a = ativos[i]
      const b = ativos[j]
      if (a.diaSemana !== b.diaSemana) continue
      for (const ra of rangesDoDia(a)) {
        for (const rb of rangesDoDia(b)) {
          if (ra.start < rb.end && rb.start < ra.end) {
            return `Turnos sobrepostos no mesmo dia (dia ${a.diaSemana}).`
          }
        }
      }
    }
  }

  return null
}
