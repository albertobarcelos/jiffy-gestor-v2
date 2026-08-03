import type { DeliveryPublicoDesignMeResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { buscarDesignDeliveryMe } from '@/src/infrastructure/api/deliveryDesignApi'

export class BuscarDesignDeliveryMeUseCase {
  async execute(token: string): Promise<DeliveryPublicoDesignMeResponseDTO | null> {
    return buscarDesignDeliveryMe(token)
  }
}

export const buscarDesignDeliveryMeUseCase = new BuscarDesignDeliveryMeUseCase()
