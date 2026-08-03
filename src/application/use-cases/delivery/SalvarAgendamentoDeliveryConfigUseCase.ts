import type {
  AgendamentoDeliveryConfigDTO,
  UpdateAgendamentoDeliveryConfigInput,
} from '@/src/application/dto/delivery/AgendamentoDeliveryDTO'
import { validarConfigAgendamentoDelivery } from '@/src/application/services/delivery/validarConfigAgendamentoDelivery'
import { salvarAgendamentoDeliveryConfig } from '@/src/infrastructure/api/agendamentoDeliveryApi'

export class SalvarAgendamentoDeliveryConfigUseCase {
  async execute(
    token: string,
    input: UpdateAgendamentoDeliveryConfigInput
  ): Promise<AgendamentoDeliveryConfigDTO> {
    const validacao = validarConfigAgendamentoDelivery(input)
    if (!validacao.ok) {
      throw new Error(validacao.error)
    }

    const payload: UpdateAgendamentoDeliveryConfigInput = {
      ...validacao.data,
      turnos: validacao.data.turnos.map(({ id: _id, ...turno }) => turno),
    }

    return salvarAgendamentoDeliveryConfig(token, payload)
  }
}

export const salvarAgendamentoDeliveryConfigUseCase =
  new SalvarAgendamentoDeliveryConfigUseCase()
