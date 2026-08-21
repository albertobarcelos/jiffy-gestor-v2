'use client'

import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { LAYOUT_MODELS } from '../../../shared/constants/layoutModels'
import { DesignSelectableCard } from '../DesignSelectableCard'
import { LayoutModelWireframe } from '../LayoutModelWireframe'

type DesignModelosTabProps = {
  config: DeliveryPublicoDesignConfig
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

export function DesignModelosTab({ config, onChange }: DesignModelosTabProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-primary">Modelos</h3>
        <p className="mt-1 text-sm text-secondary-text">
          Escolha a estrutura do catálogo. Cores, fontes e demais opções do design aplicam em
          qualquer modelo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {LAYOUT_MODELS.map(modelo => (
          <DesignSelectableCard
            key={modelo.id}
            selected={config.layoutId === modelo.id}
            premium={modelo.premium}
            title={modelo.nome}
            description={modelo.descricao}
            onClick={() => onChange(current => ({ ...current, layoutId: modelo.id }))}
          >
            <LayoutModelWireframe layoutId={modelo.id} />
          </DesignSelectableCard>
        ))}
      </div>
    </div>
  )
}
