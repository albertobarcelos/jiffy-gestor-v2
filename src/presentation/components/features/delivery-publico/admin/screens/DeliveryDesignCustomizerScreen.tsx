'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { MdArrowBack, MdRefresh } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { showToast } from '@/src/shared/utils/toast'
import type { DesignTabId } from '../../shared/types/deliveryPublicoDesignConfig'
import {
  canPublishDesign,
  getPublishDisabledReason,
} from '../../shared/constants/designPublishRules'
import { useDeliveryDesignDraft } from '../../shared/hooks/useDeliveryDesignDraft'
import { DesignTabNav } from '../components/DesignTabNav'
import { DeliveryMobilePreviewFrame } from '../components/DeliveryMobilePreviewFrame'
import { DesignCabecalhoTab } from '../components/tabs/DesignCabecalhoTab'
import { DesignModelosTab } from '../components/tabs/DesignModelosTab'
import { DesignCoresTab } from '../components/tabs/DesignCoresTab'
import { DesignTipografiasTab } from '../components/tabs/DesignTipografiasTab'
import { DesignCategoriasTab } from '../components/tabs/DesignCategoriasTab'
import { DesignElementosDestaqueTab } from '../components/tabs/DesignElementosDestaqueTab'

export function DeliveryDesignCustomizerScreen() {
  const { empresa, isLoading: empresaLoading } = useEmpresaMe()
  const { data: empresaDelivery, isLoading: deliveryLoading } = useEmpresaDeliveryMe()
  const [activeTab, setActiveTab] = useState<DesignTabId>('cabecalho')

  const { draft, hydrated, isDirty, updateDraft, publish, restore } = useDeliveryDesignDraft({
    empresaId: empresa?.id,
    slug: empresaDelivery?.slug,
    nomeExibicaoFallback: empresa?.nomeExibicao ?? '',
  })

  const canPublish = canPublishDesign(draft)

  const handlePublish = useCallback(() => {
    if (!canPublishDesign(draft)) return
    publish()
    showToast.success('Design publicado!')
  }, [draft, publish])

  const handleRestore = useCallback(() => {
    restore()
    showToast.success('Design restaurado.')
  }, [restore])

  if (empresaLoading || deliveryLoading || !hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="shrink-0 border-b border-gray-200 px-4 pb-2 pt-2 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/configuracoes/empresa-delivery"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition-colors hover:text-primary"
          >
            <MdArrowBack className="h-4 w-4" aria-hidden />
            Voltar
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRestore}
              disabled={!isDirty}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MdRefresh className="h-4 w-4" aria-hidden />
              Restaurar design
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish}
              title={getPublishDisabledReason(draft)}
              className="inline-flex h-9 items-center rounded-lg bg-secondary px-5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publicar
            </button>
          </div>
        </div>

        <h1 className="mt-1.5 text-xl font-bold text-primary">Design</h1>
        <div className="mt-2">
          <DesignTabNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
          {activeTab === 'cabecalho' && (
            <DesignCabecalhoTab
              config={draft}
              slug={empresaDelivery?.slug}
              hasEmpresaDelivery={Boolean(empresaDelivery)}
              onChange={updateDraft}
            />
          )}
          {activeTab === 'modelos' && <DesignModelosTab config={draft} onChange={updateDraft} />}
          {activeTab === 'cores' && <DesignCoresTab config={draft} onChange={updateDraft} />}
          {activeTab === 'tipografias' && (
            <DesignTipografiasTab config={draft} onChange={updateDraft} />
          )}
          {activeTab === 'categorias' && (
            <DesignCategoriasTab config={draft} onChange={updateDraft} />
          )}
          {activeTab === 'elementos-destaque' && (
            <DesignElementosDestaqueTab config={draft} onChange={updateDraft} />
          )}
        </div>

        <aside className="flex shrink-0 justify-center border-t border-gray-200 bg-gray-50 p-3 lg:sticky lg:top-0 lg:w-[min(100%,26.25rem)] lg:max-w-[26.25rem] lg:self-start lg:border-l lg:border-t-0 lg:p-4 xl:w-[min(100%,27.5rem)] xl:max-w-[27.5rem]">
          <DeliveryMobilePreviewFrame config={draft} />
        </aside>
      </div>
    </div>
  )
}
