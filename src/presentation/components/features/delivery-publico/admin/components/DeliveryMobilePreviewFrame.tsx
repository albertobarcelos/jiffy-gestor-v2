'use client'

import '@/src/presentation/components/features/delivery-publico/shared/theme/delivery-publico-theme.css'
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
    <div className="mx-auto flex w-full max-w-[23.75rem] flex-col items-center lg:max-w-none">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">
        Preview · {layoutNome}
      </p>
      <div
        className="delivery-preview-shell relative overflow-hidden rounded-[2rem] border-8 border-gray-900 bg-white shadow-xl"
        style={themeStyle}
      >
        <div className="delivery-preview-viewport mx-auto overflow-y-auto scrollbar-hide">
          <div className="delivery-preview-scale-host">
            <div className="delivery-theme @container w-full min-w-0">
              <LayoutHome config={config} viewModel={viewModel} interactive={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
