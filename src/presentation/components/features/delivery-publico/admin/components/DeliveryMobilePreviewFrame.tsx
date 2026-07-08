'use client'

import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'
import { applyDesignConfig } from '../../shared/theme/applyDesignPreviewTheme'
import { buildMockDeliveryViewModel } from '../../shared/mappers/buildMockViewModel'
import { LAYOUT_MODELS } from '../../shared/constants/layoutModels'
import { resolveDeliveryLayoutHome } from '../../public/layouts/DeliveryPublicoLayoutRegistry'

type DeliveryMobilePreviewFrameProps = {
  config: DeliveryPublicoDesignConfig
}

export function DeliveryMobilePreviewFrame({ config }: DeliveryMobilePreviewFrameProps) {
  const layoutNome = LAYOUT_MODELS.find(m => m.id === config.layoutId)?.nome ?? 'Básico'
  const themeStyle = applyDesignConfig(config)
  const viewModel = buildMockDeliveryViewModel()
  const LayoutHome = resolveDeliveryLayoutHome(config.layoutId)

  return (
    <div className="flex flex-col items-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary-text">
        Preview · {layoutNome}
      </p>
      <div
        className="relative w-[280px] overflow-hidden rounded-[2rem] border-8 border-gray-900 bg-white shadow-xl"
        style={themeStyle}
      >
        <div className="max-h-[520px] overflow-y-auto scrollbar-hide">
          <LayoutHome config={config} viewModel={viewModel} interactive={false} />
        </div>
      </div>
    </div>
  )
}
