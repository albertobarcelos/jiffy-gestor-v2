import type { CSSProperties } from 'react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { getColorPaletteById } from '../constants/colorPalettes'
import { getTypographyPresetById } from '../constants/typographyPresets'

export function applyDesignConfig(config: DeliveryPublicoDesignConfig): CSSProperties {
  const palette = getColorPaletteById(config.cores.paletaId)
  const typography = getTypographyPresetById(config.tipografia.presetId)

  const heroBackground =
    config.elementosDestaque.corFundoModo === 'personalizada'
      ? config.elementosDestaque.corFundoPersonalizada
      : palette.colors.primary

  return {
    ['--delivery-primary' as string]: palette.colors.primary,
    ['--delivery-primary-dark' as string]: palette.colors.primaryDark,
    ['--delivery-surface' as string]: palette.colors.surface,
    ['--delivery-bg' as string]: palette.colors.surface,
    ['--delivery-text' as string]: palette.colors.text,
    ['--delivery-btn-text' as string]: '#FFFFFF',
    ['--delivery-font-title' as string]: typography.titleFontFamily,
    ['--delivery-font-body' as string]: typography.bodyFontFamily,
    ['--delivery-hero-bg' as string]: heroBackground,
  }
}

/** @deprecated Use applyDesignConfig */
export function getDesignPreviewStyle(config: DeliveryPublicoDesignConfig): CSSProperties {
  return applyDesignConfig(config)
}
