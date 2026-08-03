import {
  updateAgendamentoDeliveryConfigSchema,
  type AgendamentoDeliveryConfigDTO,
  type UpdateAgendamentoDeliveryConfigInput,
} from '@/src/application/dto/delivery/AgendamentoDeliveryDTO'
import { validarTurnosAgendamentoDelivery } from '@/src/domain/services/delivery/ValidarTurnosAgendamentoDelivery'

/**
 * Pré-condições de fluxo antes de persistir a config de agendamento.
 */
export function validarConfigAgendamentoDelivery(
  input: UpdateAgendamentoDeliveryConfigInput
): { ok: true; data: AgendamentoDeliveryConfigDTO } | { ok: false; error: string } {
  const parsed = updateAgendamentoDeliveryConfigSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      ok: false,
      error: first?.message || 'Dados de agendamento inválidos.',
    }
  }

  const erroTurnos = validarTurnosAgendamentoDelivery(parsed.data.turnos)
  if (erroTurnos) {
    return { ok: false, error: erroTurnos }
  }

  return { ok: true, data: parsed.data }
}
