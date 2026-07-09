'use client'

import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'
import { DeliveryGrupoCategoriaVisual } from './DeliveryGrupoCategoriaVisual'

const MOBILE_COLUMNS_MAX = 5
const CHIP_GAP_REM = 0.5
const HORIZONTAL_PADDING_REM = 2

type DeliveryGrupoChipsProps = {
  config: DeliveryPublicoDesignConfig
  grupos: DeliveryPublicoGrupoViewModel[]
  interactive?: boolean
  embedded?: boolean
  onGrupoClick?: (grupoId: string) => void
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
  embedded = false,
  onGrupoClick,
}: DeliveryGrupoChipsProps) {
  if (!config.categorias.mostrar || grupos.length === 0) return null

  const chipWidth = resolveChipWidth(grupos.length)
  const chipStyle = { flex: `0 0 ${chipWidth}` } as const
  const wrapperClass = embedded
    ? 'w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide [container-type:inline-size]'
    : 'mt-3 w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide [container-type:inline-size]'

  return (
    <div className={wrapperClass}>
      <div className="flex w-max min-w-full gap-2 px-4">
        {grupos.map(grupo => {
          const content = (
            <>
              <DeliveryGrupoCategoriaVisual config={config} grupo={grupo} size="lg" />
              <span
                className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight @sm:text-xs @lg:text-sm @xl:text-base"
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
                className="flex snap-start flex-col items-center gap-1.5 @lg:gap-2"
                style={chipStyle}
              >
                {content}
              </button>
            )
          }

          return (
            <div
              key={grupo.id}
              className="flex snap-start flex-col items-center gap-1.5 @lg:gap-2"
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
