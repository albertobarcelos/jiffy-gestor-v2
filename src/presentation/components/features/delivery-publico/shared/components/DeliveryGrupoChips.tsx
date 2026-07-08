'use client'

import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'
import { PREVIEW_DESIGN_CATEGORIES } from '../constants/previewCatalogMock'

const MOBILE_COLUMNS_MAX = 5
const CHIP_GAP_REM = 0.5
const HORIZONTAL_PADDING_REM = 2

type DeliveryGrupoChipsProps = {
  config: DeliveryPublicoDesignConfig
  grupos: DeliveryPublicoGrupoViewModel[]
  interactive?: boolean
  onGrupoClick?: (grupoId: string) => void
}

function resolveIconName(config: DeliveryPublicoDesignConfig, grupoId: string): string {
  const configured = config.categorias.iconesPorGrupoId[grupoId]
  if (configured) return configured
  const mock = PREVIEW_DESIGN_CATEGORIES.find(c => c.id === grupoId)
  return mock?.iconName ?? 'restaurant'
}

function resolveChipWidth(grupoCount: number): string {
  const columnsVisible = Math.min(grupoCount, MOBILE_COLUMNS_MAX)
  const gapTotalRem = (columnsVisible - 1) * CHIP_GAP_REM
  return `calc((100cqw - ${HORIZONTAL_PADDING_REM}rem - ${gapTotalRem}rem) / ${columnsVisible})`
}

export function DeliveryGrupoChips({
  config,
  grupos,
  interactive = false,
  onGrupoClick,
}: DeliveryGrupoChipsProps) {
  if (!config.categorias.mostrar || grupos.length === 0) return null

  const chipWidth = resolveChipWidth(grupos.length)
  const chipStyle = { flex: `0 0 ${chipWidth}` } as const

  return (
    <div
      className="mt-3 w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide [container-type:inline-size]"
    >
      <div className="flex w-max min-w-full gap-2 px-4">
        {grupos.map(grupo => {
          const iconName = resolveIconName(config, grupo.id)
          const content = (
            <>
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full sm:h-11 sm:w-11 lg:h-16 lg:w-16 xl:h-[4.5rem] xl:w-[4.5rem]"
                style={{ backgroundColor: 'var(--delivery-primary)' }}
              >
                <DinamicIcon
                  iconName={iconName}
                  color="#FFFFFF"
                  size={26}
                  className="sm:hidden"
                />
                <DinamicIcon
                  iconName={iconName}
                  color="#FFFFFF"
                  size={20}
                  className="hidden sm:block lg:hidden"
                />
                <DinamicIcon
                  iconName={iconName}
                  color="#FFFFFF"
                  size={28}
                  className="hidden lg:block xl:hidden"
                />
                <DinamicIcon
                  iconName={iconName}
                  color="#FFFFFF"
                  size={32}
                  className="hidden xl:block"
                />
              </div>
              <span
                className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight sm:text-xs lg:text-sm xl:text-base"
                style={{
                  color: 'var(--delivery-text)',
                  fontFamily: 'var(--delivery-font-body)',
                }}
              >
                {grupo.nome}
              </span>
            </>
          )

          if (interactive && onGrupoClick) {
            return (
              <button
                key={grupo.id}
                type="button"
                onClick={() => onGrupoClick(grupo.id)}
                className="flex snap-start flex-col items-center gap-1.5 lg:gap-2"
                style={chipStyle}
              >
                {content}
              </button>
            )
          }

          return (
            <div
              key={grupo.id}
              className="flex snap-start flex-col items-center gap-1.5 lg:gap-2"
              style={chipStyle}
            >
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
