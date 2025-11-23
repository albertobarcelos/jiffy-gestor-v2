/**
 * Sistema de cores do Jiffy Gestor
 * Replica exatamente as cores do Flutter FlutterFlowTheme
 * 
 * Cores extraídas de: jiffy-admin/lib/flutter_flow/flutter_flow_theme.dart
 */

/**
 * Paleta de cores principal
 */
export const colors = {
  // Cores principais
  primary: '#003366', // Azul escuro
  secondary: '#530CA3', // Roxo
  tertiary: '#006699', // Azul médio
  alternate: '#8338EC', // Roxo claro

  // Textos
  primaryText: '#171A1C', // Quase preto
  secondaryText: '#57636C', // Cinza
  terciaryText: '#97A1A9', // Cinza médio

  // Backgrounds
  primaryBackground: '#EEEEF5', // Cinza claro
  secondaryBackground: '#91B4C6', // Azul claro

  // Accents
  accent1: '#B4DD2B', // Verde limão
  accent2: '#C34848', // Vermelho
  accent3: '#61BBE8', // Azul claro
  accent4: '#057CB8', // Azul

  // Estados
  success: '#14AE5C', // Verde
  warning: '#DBA02F', // Amarelo/Laranja
  error: '#C34848', // Vermelho (mesmo que accent2)
  info: '#FFFFFF', // Branco

  // Cores customizadas
  customColor1: '#91B4C6', // Azul claro (sem transparência, versão sólida)
  customColor1Alpha: 'rgba(145, 180, 198, 0.34)', // Com transparência (0x56 = 34% opacity)
  customColor2: '#DAE5EE', // Azul muito claro
  customColor3: '#8AFAC9', // Verde claro
} as const

/**
 * Tipos TypeScript para as cores
 */
export type ColorName = keyof typeof colors

/**
 * Função helper para obter uma cor
 * @param name - Nome da cor
 * @returns Valor hexadecimal da cor
 */
export function getColor(name: ColorName): string {
  return colors[name]
}

/**
 * Função helper para obter uma cor com opacidade
 * @param name - Nome da cor
 * @param opacity - Opacidade (0-1)
 * @returns Valor rgba da cor
 */
export function getColorWithOpacity(name: ColorName, opacity: number): string {
  const hex = colors[name]
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Mapeamento de cores para uso em Tailwind CSS
 * Usado na configuração do tailwind.config.ts
 */
export const tailwindColors = {
  primary: colors.primary,
  secondary: colors.secondary,
  tertiary: colors.tertiary,
  alternate: colors.alternate,
  'primary-text': colors.primaryText,
  'secondary-text': colors.secondaryText,
  'terciary-text': colors.terciaryText,
  'primary-bg': colors.primaryBackground,
  'secondary-bg': colors.secondaryBackground,
  accent1: colors.accent1,
  accent2: colors.accent2,
  accent3: colors.accent3,
  accent4: colors.accent4,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  'custom-1': colors.customColor1,
  'custom-2': colors.customColor2,
  'custom-3': colors.customColor3,
}

