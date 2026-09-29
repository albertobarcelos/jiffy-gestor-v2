'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import type { DesignCategoriaGrupo } from '../../../shared/types/designCategoriaGrupo'
import type { DesignModelosAbaId } from '../../../shared/constants/designTabs'
import { LAYOUT_MODELS } from '../../../shared/constants/layoutModels'
import { DesignSelectableCard } from '../DesignSelectableCard'
import { LayoutModelWireframe } from '../LayoutModelWireframe'
import { DesignCoresTab } from './DesignCoresTab'
import { DesignTipografiasTab } from './DesignTipografiasTab'
import { DesignCategoriasTab } from './DesignCategoriasTab'

type DesignModelosTabProps = {
  aba: DesignModelosAbaId
  config: DeliveryPublicoDesignConfig
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
  previewCategoriasGrupos: DesignCategoriaGrupo[]
  setPreviewCategoriasGrupos: Dispatch<SetStateAction<DesignCategoriaGrupo[]>>
  menuDeliveryId: string | null
  hasMenu: boolean
  categoriasGruposLoading: boolean
  categoriasGruposError: boolean
}

function LayoutModelosPanel({
  config,
  onChange,
}: Pick<DesignModelosTabProps, 'config' | 'onChange'>) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-secondary-text">
        Escolha a estrutura do catálogo. Cores, tipografias e categorias aplicam em qualquer
        modelo.
      </p>
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

export function DesignModelosTab({
  aba,
  config,
  onChange,
  previewCategoriasGrupos,
  setPreviewCategoriasGrupos,
  menuDeliveryId,
  hasMenu,
  categoriasGruposLoading,
  categoriasGruposError,
}: DesignModelosTabProps) {
  if (aba === 'layout') {
    return <LayoutModelosPanel config={config} onChange={onChange} />
  }
  if (aba === 'cores') {
    return <DesignCoresTab config={config} onChange={onChange} />
  }
  if (aba === 'tipografias') {
    return <DesignTipografiasTab config={config} onChange={onChange} />
  }
  return (
    <DesignCategoriasTab
      config={config}
      grupos={previewCategoriasGrupos}
      menuId={menuDeliveryId}
      hasMenu={hasMenu}
      isLoading={categoriasGruposLoading}
      isError={categoriasGruposError}
      onChange={onChange}
      onGruposChange={setPreviewCategoriasGrupos}
    />
  )
}
