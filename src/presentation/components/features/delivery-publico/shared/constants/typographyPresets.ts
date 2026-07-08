import type { TypographyPresetId } from '../types/deliveryPublicoDesignConfig'

export type TypographyPresetDefinition = {
  id: TypographyPresetId
  nome: string
  premium: boolean
  titleFontFamily: string
  bodyFontFamily: string
}

export const TYPOGRAPHY_PRESETS: TypographyPresetDefinition[] = [
  {
    id: 'urbana',
    nome: 'Urbana',
    premium: false,
    titleFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
    bodyFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
  },
  {
    id: 'moderna',
    nome: 'Moderna',
    premium: true,
    titleFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
    bodyFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
  },
  {
    id: 'classica',
    nome: 'Clássica',
    premium: true,
    titleFontFamily: 'Georgia, "Times New Roman", serif',
    bodyFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
  },
  {
    id: 'elegante',
    nome: 'Elegante',
    premium: true,
    titleFontFamily: 'Georgia, "Times New Roman", serif',
    bodyFontFamily: 'Georgia, "Times New Roman", serif',
  },
]

export function getTypographyPresetById(id: TypographyPresetId): TypographyPresetDefinition {
  return TYPOGRAPHY_PRESETS.find(p => p.id === id) ?? TYPOGRAPHY_PRESETS[0]
}
