import React from 'react'
import * as MdiIcons from 'react-icons/md'

/**
 * Mapeamento de ícones customizados que não existem no react-icons/md
 * Mapeia nomes do Flutter para ícones similares do Material Design
 * Usa apenas ícones que realmente existem no pacote
 */
const CUSTOM_ICON_MAP: Record<string, keyof typeof MdiIcons> = {
  // Ícones de comida - mapeados para ícones similares que existem
  rice: 'MdRestaurant', // Usa restaurante como fallback
  hamburgercheck: 'MdFastfood',
  hamburger_check: 'MdFastfood',
  foodhotdog: 'MdRestaurant',
  food_hot_dog: 'MdRestaurant',
  corn: 'MdRestaurant', // Usa restaurante como fallback
  foodsteak: 'MdRestaurant',
  food_steak: 'MdRestaurant',
  bottlewine: 'MdLocalBar',
  bottle_wine: 'MdLocalBar',
  // Adicione mais mapeamentos conforme necessário
}

/**
 * Converte nome de ícone do Flutter para chave do react-icons
 * O Flutter usa MdiIcons.fromString() que aceita nomes como:
 * - "home" -> "MdHome"
 * - "mdi:home" -> "MdHome"
 * - "account" -> "MdAccount"
 */
function normalizeIconName(iconName: string): string {
  // Remove prefixos comuns
  let cleanName = iconName
    .toLowerCase()
    .trim()
    .replace(/^mdi:/, '')
    .replace(/^mdi-/, '')
    .replace(/^md/, '')
    .replace(/^faicon\./, '')
    .replace(/^fa\./, '')
    .replace(/-/g, '_')

  // Verifica se há mapeamento customizado
  if (CUSTOM_ICON_MAP[cleanName]) {
    return CUSTOM_ICON_MAP[cleanName]
  }

  // Converte snake_case para PascalCase
  const parts = cleanName.split('_')
  const pascalCase = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  return `Md${pascalCase}`
}

/**
 * Busca ícone similar baseado em palavras-chave
 * Usa apenas ícones que realmente existem no react-icons/md
 */
function findSimilarIcon(iconName: string): React.ComponentType<any> | null {
  const lowerName = iconName.toLowerCase()
  
  // Mapeamento de palavras-chave para ícones similares que existem
  if (lowerName.includes('rice') || lowerName.includes('bowl')) {
    return (MdiIcons as any).MdRestaurant
  }
  if (lowerName.includes('hamburger') || lowerName.includes('burger') || lowerName.includes('fastfood')) {
    return (MdiIcons as any).MdFastfood || (MdiIcons as any).MdRestaurant
  }
  if (lowerName.includes('hotdog') || lowerName.includes('hot_dog') || lowerName.includes('sausage')) {
    return (MdiIcons as any).MdRestaurant || (MdiIcons as any).MdFastfood
  }
  if (lowerName.includes('corn') || lowerName.includes('vegetable')) {
    return (MdiIcons as any).MdRestaurant
  }
  if (lowerName.includes('steak') || lowerName.includes('meat') || lowerName.includes('dinner')) {
    return (MdiIcons as any).MdRestaurant
  }
  if (lowerName.includes('wine') || lowerName.includes('bottle') || lowerName.includes('drink')) {
    return (MdiIcons as any).MdLocalBar || (MdiIcons as any).MdRestaurant
  }
  if (lowerName.includes('food') || lowerName.includes('meal')) {
    return (MdiIcons as any).MdRestaurant
  }
  
  return null
}

/**
 * Busca o componente de ícone no pacote MdiIcons
 */
function findIconComponent(iconName: string): React.ComponentType<any> | null {
  const normalized = normalizeIconName(iconName)
  
  // Tenta encontrar o ícone diretamente
  if ((MdiIcons as any)[normalized]) {
    return (MdiIcons as any)[normalized]
  }

  // Tenta variações comuns
  const variations = [
    normalized,
    normalized.replace(/^Md/, ''),
    `Md${iconName.charAt(0).toUpperCase() + iconName.slice(1)}`,
  ]

  for (const variation of variations) {
    if ((MdiIcons as any)[variation]) {
      return (MdiIcons as any)[variation]
    }
  }

  return null
}

/**
 * Renderiza um ícone baseado no nome do ícone
 * Replica a funcionalidade do DinamicIconButton do Flutter
 * O Flutter usa: MdiIcons.fromString(iconName)
 */
export function renderIcon(
  iconName: string | null | undefined,
  color: string = '#000000',
  size: number = 24
): React.ReactElement {
  if (!iconName || iconName.trim() === '') {
    // Ícone padrão se não houver nome
    return <MdiIcons.MdHelpOutline color={color} size={size} />
  }

  const iconComponent = findIconComponent(iconName)

  if (!iconComponent) {
    // Se não encontrou, tenta usar o nome diretamente como chave
    const directKey = iconName as keyof typeof MdiIcons
    if (MdiIcons[directKey]) {
      const IconComponent = MdiIcons[directKey] as React.ComponentType<any>
      return <IconComponent color={color} size={size} />
    }

    // Tenta encontrar ícone similar baseado no nome
    const similarIcon = findSimilarIcon(iconName)
    if (similarIcon) {
      const IconComponent = similarIcon as React.ComponentType<any>
      return <IconComponent color={color} size={size} />
    }

    // Se ainda não encontrou, usa ícone padrão (sem warning em produção)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Ícone não encontrado: ${iconName}, usando ícone padrão`)
    }
    return <MdiIcons.MdHelpOutline color={color} size={size} />
  }

  const IconComponent = iconComponent
  return <IconComponent color={color} size={size} />
}

/**
 * Componente React para renderizar ícone dinâmico
 */
interface DinamicIconProps {
  iconName: string | null | undefined
  color?: string
  size?: number
  className?: string
}

export function DinamicIcon({
  iconName,
  color = '#000000',
  size = 24,
  className = '',
}: DinamicIconProps) {
  return (
    <span className={className}>
      {renderIcon(iconName, color, size)}
    </span>
  )
}

