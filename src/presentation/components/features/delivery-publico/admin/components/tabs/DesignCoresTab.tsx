'use client'

import { showToast } from '@/src/shared/utils/toast'
import type { ColorPaletteId, DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { COLOR_PALETTES } from '../../../shared/constants/colorPalettes'
import { DesignSelectableCard } from '../DesignSelectableCard'

type DesignCoresTabProps = {
  config: DeliveryPublicoDesignConfig
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

function PaletteSwatches({ paletteId }: { paletteId: ColorPaletteId }) {
  const palette = COLOR_PALETTES.find(p => p.id === paletteId)!
  const swatches = [
    palette.colors.primary,
    palette.colors.primaryDark,
    palette.colors.surface,
    palette.colors.text,
  ]
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {swatches.map((color, index) => (
        <div
          key={`${paletteId}-${index}`}
          className="h-8 rounded-md border border-gray-100"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

export function DesignCoresTab({ config, onChange }: DesignCoresTabProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-primary">Cores sugeridas</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COLOR_PALETTES.map(paleta => (
          <DesignSelectableCard
            key={paleta.id}
            selected={config.cores.paletaId === paleta.id}
            premium={paleta.premium}
            disabled={paleta.premium}
            title={paleta.nome}
            onClick={() => {
              if (paleta.premium) {
                showToast.info('Esta paleta estará disponível em breve.')
                return
              }
              onChange(current => ({
                ...current,
                cores: { paletaId: paleta.id },
              }))
            }}
          >
            <PaletteSwatches paletteId={paleta.id} />
          </DesignSelectableCard>
        ))}
      </div>
    </div>
  )
}
