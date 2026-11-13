import type { DeliveryPublicoDesignConfigDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { validarDraftDesign } from '@/src/application/services/delivery/validarDraftDesign'
import { PodePublicarDesignDeliveryPolicy } from '@/src/domain/delivery/policies/PodePublicarDesignDeliveryPolicy'

export function validarPublicacaoDesign(input: unknown): DeliveryPublicoDesignConfigDTO {
  const config = validarDraftDesign(input)
  PodePublicarDesignDeliveryPolicy.assert(config)
  return config
}
