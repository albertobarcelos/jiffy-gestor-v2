'use client'

import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { resolveMdiIconNameForStyle } from '@/src/shared/utils/mdiIcons'
import { cn } from '@/src/shared/utils/cn'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { resolveDesignPaletteColors } from '../constants/colorPalettes'

type GrupoCategoriaVisualSource = {
  id: string
  iconName?: string | null
  imagemUrl?: string | null
}

type DeliveryGrupoCategoriaVisualProps = {
  config: DeliveryPublicoDesignConfig
  grupo: GrupoCategoriaVisualSource
  size?: 'sm' | 'md' | 'lg'
  /** Diâmetro explícito em px (sobrescreve `size` quando informado). */
  diameterPx?: number
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  /** Mobile base ~4.2rem; desktop (@lg+) ~5.25rem. */
  lg: 'h-[4.2rem] w-[4.2rem] @lg:h-[5.25rem] @lg:w-[5.25rem]',
} as const

const ICON_SIZES = {
  sm: 18,
  md: 24,
  lg: 31,
} as const

function resolveIconSizePx(size: 'sm' | 'md' | 'lg', diameterPx?: number): number {
  if (typeof diameterPx === 'number' && diameterPx > 0) {
    return Math.max(14, Math.round(diameterPx * 0.45))
  }
  return ICON_SIZES[size]
}

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

function resolveIconPresentation(config: DeliveryPublicoDesignConfig): {
  backgroundColor: string
  border: string | undefined
  iconColor: string
} {
  const primaryColor = resolveDesignPaletteColors(config).primary

  if (config.categorias.estiloIcone === 'linha') {
    return {
      backgroundColor: 'transparent',
      border: `2px solid ${primaryColor}`,
      iconColor: primaryColor,
    }
  }

  return {
    backgroundColor: primaryColor,
    border: undefined,
    iconColor: '#FFFFFF',
  }
}

export function DeliveryGrupoCategoriaVisual({
  config,
  grupo,
  size = 'md',
  diameterPx,
  className,
}: DeliveryGrupoCategoriaVisualProps) {
  const hasDiameter = typeof diameterPx === 'number' && diameterPx > 0
  const sizeClass = hasDiameter ? undefined : SIZE_CLASSES[size]
  const diameterStyle = hasDiameter
    ? { width: diameterPx, height: diameterPx, minWidth: diameterPx, minHeight: diameterPx }
    : undefined
  const iconName = resolveIconName(config, grupo)
  const displayIconName = resolveMdiIconNameForStyle(iconName, config.categorias.estiloIcone)
  const { backgroundColor, border, iconColor } = resolveIconPresentation(config)
  const primaryColor = resolveDesignPaletteColors(config).primary

  if (shouldUseGrupoImagem(config, grupo)) {
    return (
      <div
        className={cn('box-border shrink-0 overflow-hidden rounded-full', sizeClass, className)}
        style={{ border: `1px solid ${primaryColor}`, ...diameterStyle }}
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
        'box-border flex shrink-0 items-center justify-center rounded-full',
        sizeClass,
        className
      )}
      style={{ backgroundColor, border, ...diameterStyle }}
    >
      <DinamicIcon
        iconName={displayIconName}
        color={iconColor}
        size={resolveIconSizePx(size, diameterPx)}
        className={!hasDiameter && size === 'lg' ? '@lg:scale-150' : undefined}
      />
    </div>
  )
}

export { resolveIconName, shouldUseGrupoImagem }
