'use client'

import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import type { DesignCategoriaGrupo } from '../../../shared/types/designCategoriaGrupo'
import {
  DESIGN_MODELOS_ABA_QUERY_KEY,
  DESIGN_MODELOS_ABAS,
  deliveryHubDesignModelosPath,
  isDesignModelosAbaId,
  type DesignModelosAbaId,
} from '../../../shared/constants/designTabs'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { cn } from '@/src/shared/utils/cn'
import { LAYOUT_MODELS } from '../../../shared/constants/layoutModels'
import { DesignSelectableCard } from '../DesignSelectableCard'
import { LayoutModelWireframe } from '../LayoutModelWireframe'
import { DesignCoresTab } from './DesignCoresTab'
import { DesignTipografiasTab } from './DesignTipografiasTab'
import { DesignCategoriasTab } from './DesignCategoriasTab'

type DesignModelosTabProps = {
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
  config,
  onChange,
  previewCategoriasGrupos,
  setPreviewCategoriasGrupos,
  menuDeliveryId,
  hasMenu,
  categoriasGruposLoading,
  categoriasGruposError,
}: DesignModelosTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toGestao } = useGestaoPath()

  const abaParam = searchParams.get(DESIGN_MODELOS_ABA_QUERY_KEY)
  const activeAba: DesignModelosAbaId = isDesignModelosAbaId(abaParam)
    ? abaParam
    : 'layout'

  const setAba = useCallback(
    (aba: DesignModelosAbaId) => {
      router.replace(toGestao(deliveryHubDesignModelosPath(aba)))
    },
    [router, toGestao]
  )

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Opções de modelos"
        className="flex flex-wrap gap-1 border-b border-gray-200"
      >
        {DESIGN_MODELOS_ABAS.map(aba => {
          const selected = activeAba === aba.id
          return (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setAba(aba.id)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
                selected
                  ? 'border-alternate text-alternate'
                  : 'border-transparent text-secondary-text hover:text-primary'
              )}
            >
              {aba.label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel">
        {activeAba === 'layout' ? (
          <LayoutModelosPanel config={config} onChange={onChange} />
        ) : null}
        {activeAba === 'cores' ? (
          <DesignCoresTab config={config} onChange={onChange} />
        ) : null}
        {activeAba === 'tipografias' ? (
          <DesignTipografiasTab config={config} onChange={onChange} />
        ) : null}
        {activeAba === 'categorias' ? (
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
        ) : null}
      </div>
    </div>
  )
}
