import React from 'react'
import * as MdiIcons from 'react-icons/md'

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

  // Converte snake_case para PascalCase
  const parts = cleanName.split('_')
  const pascalCase = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  return `Md${pascalCase}`
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

    // Se ainda não encontrou, usa ícone padrão
    console.warn(`Ícone não encontrado: ${iconName}, usando ícone padrão`)
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

