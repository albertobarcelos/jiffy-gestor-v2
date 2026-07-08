'use client'

import { showToast } from '@/src/shared/utils/toast'
import type { DeliveryLayoutId, DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { LAYOUT_MODELS } from '../../../shared/constants/layoutModels'
import { DesignSelectableCard } from '../DesignSelectableCard'

type DesignModelosTabProps = {
  config: DeliveryPublicoDesignConfig
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

function LayoutWireframe({ layoutId }: { layoutId: DeliveryLayoutId }) {
  const bar = 'rounded bg-gray-200'
  if (layoutId === 'vitrine') {
    return (
      <div className="space-y-2">
        <div className={`${bar} h-8 w-full`} />
        <div className={`${bar} h-16 w-full`} />
        <div className={`${bar} h-16 w-full`} />
      </div>
    )
  }
  if (layoutId === 'grade') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className={`${bar} h-12`} />
        <div className={`${bar} h-12`} />
        <div className={`${bar} h-12`} />
        <div className={`${bar} h-12`} />
      </div>
    )
  }
  if (layoutId === 'catalogo') {
    return (
      <div className="flex gap-2">
        <div className={`${bar} h-20 w-1/3`} />
        <div className="flex-1 space-y-2">
          <div className={`${bar} h-4 w-full`} />
          <div className={`${bar} h-4 w-3/4`} />
          <div className={`${bar} h-4 w-2/3`} />
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className={`${bar} h-3 w-full`} />
      <div className={`${bar} h-8 w-full`} />
      <div className={`${bar} h-8 w-full`} />
      <div className={`${bar} h-8 w-2/3`} />
    </div>
  )
}

export function DesignModelosTab({ config, onChange }: DesignModelosTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-primary">Modelos</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {LAYOUT_MODELS.map(modelo => (
          <DesignSelectableCard
            key={modelo.id}
            selected={config.layoutId === modelo.id}
            premium={modelo.premium}
            disabled={!modelo.disponivel}
            title={modelo.nome}
            description={modelo.descricao}
            onClick={() => {
              if (!modelo.disponivel) {
                showToast.info('Este modelo estará disponível em breve.')
                return
              }
              onChange(current => ({ ...current, layoutId: modelo.id }))
            }}
          >
            <LayoutWireframe layoutId={modelo.id} />
          </DesignSelectableCard>
        ))}
      </div>
    </div>
  )
}
