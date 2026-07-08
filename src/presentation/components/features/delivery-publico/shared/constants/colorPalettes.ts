import { colors } from '@/src/shared/theme/colors'
import type { ColorPaletteId } from '../types/deliveryPublicoDesignConfig'

export type ColorPaletteDefinition = {
  id: ColorPaletteId
  nome: string
  premium: boolean
  colors: {
    primary: string
    primaryDark: string
    surface: string
    text: string
  }
}

/**
 * Paletas sugeridas do customizador Design.
 * Lavanda (padrão) usa exatamente `alternate` (roxo claro) e `secondary` (roxo escuro) do tema Jiffy.
 */
export const COLOR_PALETTES: ColorPaletteDefinition[] = [
  {
    id: 'lavanda',
    nome: 'Lavanda',
    premium: false,
    colors: {
      primary: colors.alternate, // #8338EC — roxo claro
      primaryDark: colors.secondary, // #530CA3 — roxo escuro
      surface: '#FFFFFF',
      text: colors.primaryText,
    },
  },
  {
    id: 'pessego',
    nome: 'Pêssego',
    premium: true,
    colors: { primary: '#FF6B00', primaryDark: '#C2410C', surface: '#FFFFFF', text: '#171A1C' },
  },
  {
    id: 'canela',
    nome: 'Canela',
    premium: true,
    colors: { primary: '#D97706', primaryDark: '#92400E', surface: '#FFFFFF', text: '#171A1C' },
  },
  {
    id: 'cereja',
    nome: 'Cereja',
    premium: true,
    colors: { primary: '#DC2626', primaryDark: '#991B1B', surface: '#FFF5F5', text: '#171A1C' },
  },
  {
    id: 'gergelim',
    nome: 'Gergelim',
    premium: true,
    colors: { primary: '#171717', primaryDark: '#000000', surface: '#F5F5F5', text: '#171A1C' },
  },
  {
    id: 'mirtilo',
    nome: 'Mirtilo',
    premium: true,
    colors: { primary: '#2563EB', primaryDark: '#1E3A8A', surface: '#FFFFFF', text: '#171A1C' },
  },
  {
    id: 'hortela',
    nome: 'Hortelã',
    premium: true,
    colors: { primary: '#059669', primaryDark: '#065F46', surface: '#ECFDF5', text: '#171A1C' },
  },
  {
    id: 'chocolate',
    nome: 'Chocolate',
    premium: true,
    colors: { primary: '#78350F', primaryDark: '#451A03', surface: '#FFF7ED', text: '#171A1C' },
  },
  {
    id: 'mostarda',
    nome: 'Mostarda',
    premium: true,
    colors: { primary: '#EAB308', primaryDark: '#854D0E', surface: '#FFFFFF', text: '#171A1C' },
  },
  {
    id: 'carvao',
    nome: 'Carvão',
    premium: true,
    colors: { primary: '#525252', primaryDark: '#171717', surface: '#F5F5F5', text: '#171A1C' },
  },
]

export function getColorPaletteById(id: ColorPaletteId): ColorPaletteDefinition {
  return COLOR_PALETTES.find(p => p.id === id) ?? COLOR_PALETTES[0]
}
