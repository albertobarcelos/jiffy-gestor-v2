import { uiDesignConfigToApi } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import { validarPublicacaoDesign } from '@/src/application/services/delivery/validarPublicacaoDesign'
import { PodePublicarDesignDeliveryPolicy } from '@/src/domain/delivery/policies/PodePublicarDesignDeliveryPolicy'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

/**
 * Gate de UX. A policy de domínio decide; o backend continua sendo a fonte no publish.
 */
export function canPublishDesign(config: DeliveryPublicoDesignConfig): boolean {
  try {
    return PodePublicarDesignDeliveryPolicy.check(uiDesignConfigToApi(config))
  } catch {
    return false
  }
}

export function getPublishDisabledReason(
  config: DeliveryPublicoDesignConfig
): string | undefined {
  try {
    validarPublicacaoDesign(uiDesignConfigToApi(config))
    return undefined
  } catch (error) {
    if (error instanceof Error && error.message.trim()) {
      return error.message
    }
    return 'Esta combinação de layout, paleta ou tipografia não pode ser publicada no momento'
  }
}
