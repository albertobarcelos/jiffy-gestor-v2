import type { TypographyPresetId } from '../types/deliveryPublicoDesignConfig'

export type TypographyPresetDefinition = {
  id: TypographyPresetId
  nome: string
  premium: boolean
  /** Pode ser publicada no cardápio público (demais presets: preview no designer apenas). */
  publicavel: boolean
  titleFontFamily: string
  bodyFontFamily: string
}

export const TYPOGRAPHY_PRESETS: TypographyPresetDefinition[] = [
  {
    id: 'urbana',
    nome: 'Urbana',
    premium: false,
    publicavel: true,
    titleFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
    bodyFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
  },
  {
    id: 'moderna',
    nome: 'Moderna',
    premium: true,
    publicavel: false,
    titleFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
    bodyFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
  },
  {
    id: 'classica',
    nome: 'Clássica',
    premium: true,
    publicavel: false,
    titleFontFamily: 'Georgia, "Times New Roman", serif',
    bodyFontFamily: 'var(--font-general-sans), system-ui, sans-serif',
  },
  {
    id: 'elegante',
    nome: 'Elegante',
    premium: true,
    publicavel: false,
    titleFontFamily: 'Georgia, "Times New Roman", serif',
    bodyFontFamily: 'Georgia, "Times New Roman", serif',
  },
]

export function getTypographyPresetById(id: TypographyPresetId): TypographyPresetDefinition {
  return TYPOGRAPHY_PRESETS.find(p => p.id === id) ?? TYPOGRAPHY_PRESETS[0]
}

export function canPublishTypography(presetId: TypographyPresetId): boolean {
  return TYPOGRAPHY_PRESETS.find(p => p.id === presetId)?.publicavel ?? false
}

export function getPublishableTypographyLabel(): string {
  const names = TYPOGRAPHY_PRESETS.filter(p => p.publicavel).map(p => p.nome)
  if (names.length <= 1) return names[0] ?? 'Urbana'
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}
