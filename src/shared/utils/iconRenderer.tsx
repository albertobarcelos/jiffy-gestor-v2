import React from 'react'
import { getMdiReactIcon } from './mdiIcons'

/**
 * Renderiza um ícone baseado no nome do ícone, utilizando o mapeamento MDI.
 * Inclui um fallback para um ícone de ajuda se o nome do ícone não for encontrado.
 */
export function renderIcon(
  iconName: string | null | undefined,
  color: string = '#000000',
  size: number = 24
): React.ReactElement {
  // Converte o tamanho em pixels para o multiplicador de tamanho do MDI (assumindo 24px como base)
  const mdiSizeMultiplier = size / 24;

  if (!iconName || iconName.trim() === '') {
    // Ícone padrão se não houver nome
    return getMdiReactIcon('alertCircleOutline', mdiSizeMultiplier, color);
  }

  return getMdiReactIcon(iconName, mdiSizeMultiplier, color);
}

/**
 * Componente React para renderizar ícone dinâmico
 */
interface DinamicIconProps {
  iconName: string | null | undefined;
  color?: string;
  size?: number;
  className?: string;
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
  );
}