'use client'

import { showToast } from '@/src/shared/utils/toast'
import type { DeliveryPublicoDesignConfig, TypographyPresetId } from '../../../shared/types/deliveryPublicoDesignConfig'
import { TYPOGRAPHY_PRESETS } from '../../../shared/constants/typographyPresets'
import { DesignSelectableCard } from '../DesignSelectableCard'

type DesignTipografiasTabProps = {
  config: DeliveryPublicoDesignConfig
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

function TypographyPreview({ presetId }: { presetId: TypographyPresetId }) {
  const preset = TYPOGRAPHY_PRESETS.find(p => p.id === presetId)!
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-sm font-bold text-primary-text" style={{ fontFamily: preset.titleFontFamily }}>
        Água mineral
      </p>
      <p className="mt-1 text-xs text-secondary-text" style={{ fontFamily: preset.bodyFontFamily }}>
        Garrafa de 500 ml
      </p>
    </div>
  )
}

export function DesignTipografiasTab({ config, onChange }: DesignTipografiasTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-primary">Tipografias sugeridas</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {TYPOGRAPHY_PRESETS.map(preset => (
          <DesignSelectableCard
            key={preset.id}
            selected={config.tipografia.presetId === preset.id}
            premium={preset.premium}
            disabled={preset.premium}
            title={preset.nome}
            onClick={() => {
              if (preset.premium) {
                showToast.info('Esta tipografia estará disponível em breve.')
                return
              }
              onChange(current => ({
                ...current,
                tipografia: { presetId: preset.id },
              }))
            }}
          >
            <TypographyPreview presetId={preset.id} />
          </DesignSelectableCard>
        ))}
      </div>
    </div>
  )
}
