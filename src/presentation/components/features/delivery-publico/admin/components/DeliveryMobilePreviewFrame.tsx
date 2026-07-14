'use client'

import { useMemo } from 'react'
import '@/src/presentation/components/features/delivery-publico/shared/theme/delivery-publico-theme.css'
import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'
import type { DesignCategoriaGrupo } from '../../shared/types/designCategoriaGrupo'
import { applyDesignConfig } from '../../shared/theme/applyDesignPreviewTheme'
import {
  buildMockDeliveryViewModel,
  buildPreviewViewModelFromGrupos,
} from '../../shared/mappers/buildMockViewModel'
import { LAYOUT_MODELS } from '../../shared/constants/layoutModels'
import { resolveDeliveryLayoutHome } from '../../public/layouts/DeliveryPublicoLayoutRegistry'

type DeliveryMobilePreviewFrameProps = {
  config: DeliveryPublicoDesignConfig
  categoriasGrupos?: DesignCategoriaGrupo[]
}

export function DeliveryMobilePreviewFrame({
  config,
  categoriasGrupos = [],
}: DeliveryMobilePreviewFrameProps) {
  const layoutNome = LAYOUT_MODELS.find(m => m.id === config.layoutId)?.nome ?? 'Básico'
  const themeStyle = applyDesignConfig(config)
  const viewModel = useMemo(
    () =>
      categoriasGrupos.length > 0
        ? buildPreviewViewModelFromGrupos(categoriasGrupos)
        : buildMockDeliveryViewModel(),
    [categoriasGrupos]
  )
  const LayoutHome = resolveDeliveryLayoutHome(config.layoutId)

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-stretch">
      <p className="mb-2 shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-secondary-text">
        Preview · {layoutNome}
      </p>
      <div
        className="delivery-preview-shell relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border-8 border-gray-900 bg-white shadow-xl box-border"
        style={themeStyle}
      >
        <div className="delivery-preview-viewport min-h-0 flex-1 overflow-y-auto scrollbar-hide">
          <div className="delivery-preview-scale-host">
            <div className="delivery-theme @container w-full min-w-0 overflow-x-clip">
              <LayoutHome
                config={config}
                viewModel={viewModel}
                enderecoTexto={null}
                interactive={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
