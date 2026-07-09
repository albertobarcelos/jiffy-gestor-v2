'use client'

import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { resolveMdiIconNameForStyle } from '@/src/shared/utils/mdiIcons'
import { cn } from '@/src/shared/utils/cn'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { getColorPaletteById } from '../constants/colorPalettes'

type GrupoCategoriaVisualSource = {
  id: string
  iconName?: string | null
  imagemUrl?: string | null
}

type DeliveryGrupoCategoriaVisualProps = {
  config: DeliveryPublicoDesignConfig
  grupo: GrupoCategoriaVisualSource
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-14 w-14 @sm:h-11 @sm:w-11 @lg:h-16 @lg:w-16 @xl:h-[4.5rem] @xl:w-[4.5rem]',
} as const

const ICON_SIZES = {
  sm: 18,
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

function resolveIconPresentation(config: DeliveryPublicoDesignConfig): {
  backgroundColor: string
  border: string | undefined
  iconColor: string
} {
  const primaryColor = getColorPaletteById(config.cores.paletaId).colors.primary

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
  className,
}: DeliveryGrupoCategoriaVisualProps) {
  const sizeClass = SIZE_CLASSES[size]
  const iconName = resolveIconName(config, grupo)
  const displayIconName = resolveMdiIconNameForStyle(iconName, config.categorias.estiloIcone)
  const { backgroundColor, border, iconColor } = resolveIconPresentation(config)
  const primaryColor = getColorPaletteById(config.cores.paletaId).colors.primary

  if (shouldUseGrupoImagem(config, grupo)) {
    return (
      <div
        className={cn('box-border shrink-0 overflow-hidden rounded-full', sizeClass, className)}
        style={{ border: `1px solid ${primaryColor}` }}
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
      style={{ backgroundColor, border }}
    >
      <DinamicIcon iconName={displayIconName} color={iconColor} size={ICON_SIZES[size]} />
    </div>
  )
}

export { resolveIconName, shouldUseGrupoImagem }
