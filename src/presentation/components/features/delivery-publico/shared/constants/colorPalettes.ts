import { colors } from '@/src/shared/theme/colors'
import type { ColorPaletteId } from '../types/deliveryPublicoDesignConfig'

export type ColorPaletteDefinition = {
  id: ColorPaletteId
  nome: string
  premium: boolean
  /** Pode ser publicada no cardápio público (demais paletas: preview no designer apenas). */
  publicavel: boolean
  colors: {
    primary: string
    primaryDark: string
    surface: string
    text: string
  }
}

/**
 * Paletas sugeridas do customizador Design.
 * Carvão é o padrão temporário; Lavanda usa `alternate`/`secondary` do tema Jiffy.
 */
export const COLOR_PALETTES: ColorPaletteDefinition[] = [
  {
    id: 'carvao',
    nome: 'Carvão',
    premium: false,
    publicavel: true,
    colors: { primary: '#525252', primaryDark: '#171717', surface: '#F5F5F5', text: '#171A1C' },
  },
  {
    id: 'lavanda',
    nome: 'Lavanda',
    premium: false,
    publicavel: true,
    colors: {
      primary: colors.alternate, // #8338EC — roxo claro
      primaryDark: colors.secondary, // #530CA3 — roxo escuro
      surface: '#FFFFFF',
      text: colors.primaryText,
    },
  },
  {
    id: 'mirtilo',
    nome: 'Mirtilo',
    premium: true,
    publicavel: true,
    colors: {
      primary: colors.tertiary, // #006699 — azul médio (derivado da família do primary)
      primaryDark: colors.primary, // #003366 — azul escuro do projeto
      surface: '#FFFFFF',
      text: colors.primaryText,
    },
  },
  {
    id: 'pessego',
    nome: 'Pêssego',
    premium: true,
    publicavel: false,
    colors: { primary: '#FF6B00', primaryDark: '#C2410C', surface: '#FFFFFF', text: '#171A1C' },
  },
  {
    id: 'canela',
    nome: 'Canela',
    premium: true,
    publicavel: false,
    colors: { primary: '#D97706', primaryDark: '#92400E', surface: '#FFFFFF', text: '#171A1C' },
  },
  {
    id: 'cereja',
    nome: 'Cereja',
    premium: true,
    publicavel: false,
    colors: { primary: '#DC2626', primaryDark: '#991B1B', surface: '#FFF5F5', text: '#171A1C' },
  },
  {
    id: 'gergelim',
    nome: 'Gergelim',
    premium: true,
    publicavel: false,
    colors: { primary: '#171717', primaryDark: '#000000', surface: '#F5F5F5', text: '#171A1C' },
  },
  {
    id: 'hortela',
    nome: 'Hortelã',
    premium: true,
    publicavel: false,
    colors: { primary: '#059669', primaryDark: '#065F46', surface: '#ECFDF5', text: '#171A1C' },
  },
  {
    id: 'chocolate',
    nome: 'Chocolate',
    premium: true,
    publicavel: false,
    colors: { primary: '#78350F', primaryDark: '#451A03', surface: '#FFF7ED', text: '#171A1C' },
  },
  {
    id: 'mostarda',
    nome: 'Mostarda',
    premium: true,
    publicavel: false,
    colors: { primary: '#EAB308', primaryDark: '#854D0E', surface: '#FFFFFF', text: '#171A1C' },
  },
]

export function getColorPaletteById(id: ColorPaletteId): ColorPaletteDefinition {
  return COLOR_PALETTES.find(p => p.id === id) ?? COLOR_PALETTES[0]
}

export function canPublishPalette(paletteId: ColorPaletteId): boolean {
  return COLOR_PALETTES.find(p => p.id === paletteId)?.publicavel ?? false
}

export function getPublishablePaletteLabel(): string {
  const names = COLOR_PALETTES.filter(p => p.publicavel).map(p => p.nome)
  if (names.length <= 1) return names[0] ?? 'Carvão'
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}
