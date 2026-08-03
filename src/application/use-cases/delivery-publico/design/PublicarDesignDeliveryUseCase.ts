import type {
  DeliveryPublicoDesignConfigDTO,
  DeliveryPublicoDesignMeResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { validarPublicacaoDesign } from '@/src/application/services/delivery/validarPublicacaoDesign'
import { publicarDesignDelivery } from '@/src/infrastructure/api/deliveryDesignApi'

export class PublicarDesignDeliveryUseCase {
  /**
   * @param draftAtual — se informado, aplica o gate de UX antes do POST (BE ainda valida).
   */
  async execute(
    token: string,
    draftAtual?: DeliveryPublicoDesignConfigDTO
  ): Promise<DeliveryPublicoDesignMeResponseDTO> {
    if (draftAtual !== undefined) {
      const validacao = validarPublicacaoDesign(draftAtual)
      if (!validacao.ok) {
        throw new Error(validacao.error)
      }
    }

    return publicarDesignDelivery(token)
  }
}

export const publicarDesignDeliveryUseCase = new PublicarDesignDeliveryUseCase()
