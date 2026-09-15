import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { canPublishPalette, getPublishablePaletteLabel } from './colorPalettes'
import { canPublishLayout } from './layoutModels'
import { canPublishTypography, getPublishableTypographyLabel } from './typographyPresets'

export function canPublishDesign(config: DeliveryPublicoDesignConfig): boolean {
  return (
    canPublishLayout(config.layoutId) &&
    canPublishPalette(config.cores.paletaId) &&
    canPublishTypography(config.tipografia.presetId)
  )
}

export function getPublishDisabledReason(config: DeliveryPublicoDesignConfig): string | undefined {
  if (canPublishDesign(config)) return undefined

  return `Somente o modelo Básico, as paletas ${getPublishablePaletteLabel()} e a tipografia ${getPublishableTypographyLabel()} podem ser publicados no momento`
}
