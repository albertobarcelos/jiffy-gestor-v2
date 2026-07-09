import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { canPublishPalette } from './colorPalettes'
import { canPublishLayout } from './layoutModels'

export function canPublishDesign(config: DeliveryPublicoDesignConfig): boolean {
  return canPublishLayout(config.layoutId) && canPublishPalette(config.cores.paletaId)
}

export function getPublishDisabledReason(config: DeliveryPublicoDesignConfig): string | undefined {
  if (canPublishDesign(config)) return undefined

  const blocks: string[] = []
  if (!canPublishLayout(config.layoutId)) blocks.push('modelo Básico')
  if (!canPublishPalette(config.cores.paletaId)) blocks.push('paleta Lavanda')

  if (blocks.length === 2) {
    return 'Somente o modelo Básico e a paleta Lavanda podem ser publicados no momento'
  }

  if (!canPublishLayout(config.layoutId)) {
    return 'Somente o modelo Básico pode ser publicado no momento'
  }

  return 'Somente a paleta Lavanda pode ser publicada no momento'
}
