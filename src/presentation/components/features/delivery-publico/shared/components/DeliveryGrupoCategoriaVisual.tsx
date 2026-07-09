'use client'

import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { cn } from '@/src/shared/utils/cn'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

type GrupoCategoriaVisualSource = {
  id: string
  iconName?: string | null
  imagemUrl?: string | null
}

type DeliveryGrupoCategoriaVisualProps = {
  config: DeliveryPublicoDesignConfig
  grupo: GrupoCategoriaVisualSource
  /** Cor do ícone quando exibido sobre fundo primary (lista lateral do designer). */
  iconColor?: string
  /** Cor de fundo do círculo quando exibe ícone. */
  iconBackgroundColor?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-5 w-5',
  md: 'h-12 w-12',
  lg: 'h-14 w-14 @sm:h-11 @sm:w-11 @lg:h-16 @lg:w-16 @xl:h-[4.5rem] @xl:w-[4.5rem]',
} as const

const ICON_SIZES = {
  sm: 20,
  md: 24,
  lg: 26,
} as const

function resolveIconName(
  config: DeliveryPublicoDesignConfig,
  grupo: GrupoCategoriaVisualSource
): string {
  const configured = config.categorias.iconesPorGrupoId[grupo.id]
  if (configured) return configured
  if (grupo.iconName) return grupo.iconName
  return 'restaurant'
}

function shouldUseGrupoImagem(
  config: DeliveryPublicoDesignConfig,
  grupo: GrupoCategoriaVisualSource
): boolean {
  return config.categorias.usarImagensGrupo && Boolean(grupo.imagemUrl?.trim())
}

export function DeliveryGrupoCategoriaVisual({
  config,
  grupo,
  iconColor = '#FFFFFF',
  iconBackgroundColor = 'var(--delivery-primary)',
  size = 'md',
  className,
}: DeliveryGrupoCategoriaVisualProps) {
  const sizeClass = SIZE_CLASSES[size]
  const iconName = resolveIconName(config, grupo)

  if (shouldUseGrupoImagem(config, grupo)) {
    return (
      <div
        className={cn('shrink-0 overflow-hidden rounded-full', sizeClass, className)}
      >
        <img
          src={grupo.imagemUrl!}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        sizeClass,
        className
      )}
      style={{ backgroundColor: iconBackgroundColor }}
    >
      <DinamicIcon iconName={iconName} color={iconColor} size={ICON_SIZES[size]} />
    </div>
  )
}

export { resolveIconName, shouldUseGrupoImagem }
