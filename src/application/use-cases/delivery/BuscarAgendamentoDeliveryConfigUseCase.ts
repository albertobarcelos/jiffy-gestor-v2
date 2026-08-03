import type { AgendamentoDeliveryConfigDTO } from '@/src/application/dto/delivery/AgendamentoDeliveryDTO'
import { buscarAgendamentoDeliveryConfig } from '@/src/infrastructure/api/agendamentoDeliveryApi'

export class BuscarAgendamentoDeliveryConfigUseCase {
  async execute(token: string): Promise<AgendamentoDeliveryConfigDTO | null> {
    return buscarAgendamentoDeliveryConfig(token)
  }
}

export const buscarAgendamentoDeliveryConfigUseCase =
  new BuscarAgendamentoDeliveryConfigUseCase()
