import { validarPublicacaoDesign } from '@/src/application/services/delivery/validarPublicacaoDesign'
import { uiDesignConfigToApi } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

/**
 * Gate de UX: delega para `validarPublicacaoDesign` (fonte única no FE).
 * Backend continua sendo a fonte da verdade no publish.
 */
export function canPublishDesign(config: DeliveryPublicoDesignConfig): boolean {
  try {
    validarPublicacaoDesign(uiDesignConfigToApi(config))
    return true
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
