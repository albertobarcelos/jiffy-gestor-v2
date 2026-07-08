'use client'

import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'
import { PREVIEW_DESIGN_CATEGORIES } from '../constants/previewCatalogMock'

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

export function DeliveryGrupoChips({
  config,
  grupos,
  interactive = false,
  onGrupoClick,
}: DeliveryGrupoChipsProps) {
  if (!config.categorias.mostrar || grupos.length === 0) return null

  return (
    <div className="mt-3 flex gap-3 overflow-x-auto px-4 scrollbar-hide">
      {grupos.map(grupo => {
        const iconName = resolveIconName(config, grupo.id)
        const content = (
          <>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full sm:h-11 sm:w-11"
              style={{ backgroundColor: 'var(--delivery-primary)' }}
            >
              <DinamicIcon iconName={iconName} color="#FFFFFF" size={20} />
            </div>
            <span
              className="max-w-[64px] truncate text-[10px] font-medium sm:text-xs"
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
              className="flex shrink-0 flex-col items-center gap-1"
            >
              {content}
            </button>
          )
        }

        return (
          <div key={grupo.id} className="flex shrink-0 flex-col items-center gap-1">
            {content}
          </div>
        )
      })}
    </div>
  )
}
