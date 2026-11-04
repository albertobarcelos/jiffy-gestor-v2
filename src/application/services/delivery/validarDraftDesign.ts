import {
  deliveryPublicoDesignConfigSchema,
  type DeliveryPublicoDesignConfigDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'

/** Valida apenas o shape do draft (sem gate de publicação). */
export function validarDraftDesign(input: unknown): DeliveryPublicoDesignConfigDTO {
  return deliveryPublicoDesignConfigSchema.parse(input)
}
