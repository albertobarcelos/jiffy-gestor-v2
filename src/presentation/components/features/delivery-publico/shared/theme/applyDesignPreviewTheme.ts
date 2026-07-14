import type { CSSProperties } from 'react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { resolveDesignPaletteColors } from '../constants/colorPalettes'
import { getTypographyPresetById } from '../constants/typographyPresets'

export function applyDesignConfig(config: DeliveryPublicoDesignConfig): CSSProperties {
  const palette = resolveDesignPaletteColors(config)
  const typography = getTypographyPresetById(config.tipografia.presetId)

  return {
    ['--delivery-primary' as string]: palette.primary,
    ['--delivery-primary-dark' as string]: palette.primaryDark,
    ['--delivery-surface' as string]: palette.surface,
    ['--delivery-bg' as string]: palette.surface,
    ['--delivery-text' as string]: palette.text,
    ['--delivery-btn-text' as string]: '#FFFFFF',
    ['--delivery-font-title' as string]: typography.titleFontFamily,
    ['--delivery-font-body' as string]: typography.bodyFontFamily,
    ['--delivery-hero-bg' as string]: palette.primary,
  }
}

/** @deprecated Use applyDesignConfig */
export function getDesignPreviewStyle(config: DeliveryPublicoDesignConfig): CSSProperties {
  return applyDesignConfig(config)
}
