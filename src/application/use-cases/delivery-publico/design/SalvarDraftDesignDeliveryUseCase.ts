import type {
  DeliveryPublicoDesignMeResponseDTO,
  UpdateDeliveryPublicoDesignDraftInput,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { validarDraftDesign } from '@/src/application/services/delivery/validarDraftDesign'
import { salvarDraftDesignDelivery } from '@/src/infrastructure/api/deliveryDesignApi'

export class SalvarDraftDesignDeliveryUseCase {
  async execute(
    token: string,
    input: UpdateDeliveryPublicoDesignDraftInput
  ): Promise<DeliveryPublicoDesignMeResponseDTO> {
    const validacao = validarDraftDesign(input)
    if (!validacao.ok) {
      throw new Error(validacao.error)
    }

    return salvarDraftDesignDelivery(token, validacao.data)
  }
}

export const salvarDraftDesignDeliveryUseCase =
  new SalvarDraftDesignDeliveryUseCase()
