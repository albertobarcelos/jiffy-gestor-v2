'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MdRefresh } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useMenuDeliveryId } from '@/src/presentation/hooks/useMenuDeliveryId'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { showToast } from '@/src/shared/utils/toast'
import {
  canPublishDesign,
  getPublishDisabledReason,
} from '../../shared/constants/designPublishRules'
import {
  designSectionShowsPreview,
  type DesignSectionId,
} from '../../shared/constants/designTabs'
import { useDeliveryDesignDraft } from '../../shared/hooks/useDeliveryDesignDraft'
import { useDesignCategoriaGrupos } from '../../shared/hooks/useDesignCategoriaGrupos'
import type { DesignCategoriaGrupo } from '../../shared/types/designCategoriaGrupo'
import { mergeDesignCategoriaGrupos } from '../../shared/utils/mergeDesignCategoriaGrupos'
import { DesignOpenTabsBar, type DesignWorkspaceTabId } from '../components/DesignOpenTabsBar'
import { DesignSectionCards } from '../components/DesignSectionCards'
import { DeliveryMobilePreviewFrame } from '../components/DeliveryMobilePreviewFrame'
import { DesignCabecalhoTab } from '../components/tabs/DesignCabecalhoTab'
import { DesignModelosTab } from '../components/tabs/DesignModelosTab'
import { DesignCoresTab } from '../components/tabs/DesignCoresTab'
import { DesignTipografiasTab } from '../components/tabs/DesignTipografiasTab'
import { DesignCategoriasTab } from '../components/tabs/DesignCategoriasTab'
import { NotificacoesWhatsAppDeliveryTab } from '@/src/presentation/components/features/configuracoes/tabs/NotificacoesWhatsAppDeliveryTab'
import { DeliveryNomeCardapioView } from '@/src/presentation/components/features/delivery/hub/DeliveryNomeCardapioView'

export function DeliveryDesignCustomizerScreen() {
  const searchParams = useSearchParams()
  const { empresa, isLoading: empresaLoading } = useEmpresaMe()
  const { menuDeliveryId, isLoading: menuDeliveryLoading } = useMenuDeliveryId()
  const { data: empresaDelivery, isLoading: deliveryLoading } = useEmpresaDeliveryMe()
  const [openTabs, setOpenTabs] = useState<DesignSectionId[]>([])
  const [activeTab, setActiveTab] = useState<DesignWorkspaceTabId>('home')

  const { draft, hydrated, isDirty, updateDraft, publish, restore } = useDeliveryDesignDraft({
    empresaId: empresa?.id,
    slug: empresaDelivery?.slug,
    nomeExibicaoFallback: empresa?.nomeExibicao ?? '',
  })

  const {
    grupos: categoriasGrupos,
    hasMenu,
    isLoading: categoriasGruposLoading,
    isError: categoriasGruposError,
  } = useDesignCategoriaGrupos(menuDeliveryId, Boolean(empresa?.id))

  const [previewCategoriasGrupos, setPreviewCategoriasGrupos] = useState<DesignCategoriaGrupo[]>([])

  useEffect(() => {
    setPreviewCategoriasGrupos(previous =>
      mergeDesignCategoriaGrupos(categoriasGrupos, previous)
    )
  }, [categoriasGrupos])

  const openSection = useCallback((sectionId: DesignSectionId) => {
    setOpenTabs(current => (current.includes(sectionId) ? current : [...current, sectionId]))
    setActiveTab(sectionId)
  }, [])

  useEffect(() => {
    const secao = searchParams.get('secao')
    if (secao === 'notificacoes' || secao === 'nome-cardapio') {
      openSection(secao)
    }
  }, [openSection, searchParams])

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

  const selectTab = useCallback((tabId: DesignWorkspaceTabId) => {
    setActiveTab(tabId)
  }, [])

  const closeTab = useCallback((tabId: DesignSectionId) => {
    setOpenTabs(current => {
      const next = current.filter(id => id !== tabId)
      setActiveTab(active => (active === tabId ? 'home' : active))
      return next
    })
  }, [])

  if (empresaLoading || deliveryLoading || menuDeliveryLoading || !hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <JiffyLoading />
      </div>
    )
  }

  const showingHome = activeTab === 'home'
  const showPreview = designSectionShowsPreview(activeTab)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 items-end gap-2 border-b border-gray-200 px-4 md:px-6">
        <div className="min-w-0 flex-1">
          <DesignOpenTabsBar
            openTabs={openTabs}
            activeTab={activeTab}
            onSelectTab={selectTab}
            onCloseTab={closeTab}
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 py-1.5">
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
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden${
            showPreview ? ' lg:border-r lg:border-gray-200' : ''
          }`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
            {showingHome ? (
              <DesignSectionCards onOpenSection={openSection} />
            ) : null}

            {activeTab === 'cabecalho' ? (
              <DesignCabecalhoTab
                config={draft}
                slug={empresaDelivery?.slug}
                hasEmpresaDelivery={Boolean(empresaDelivery)}
                onChange={updateDraft}
              />
            ) : null}
            {activeTab === 'modelos' ? (
              <DesignModelosTab config={draft} onChange={updateDraft} />
            ) : null}
            {activeTab === 'cores' ? (
              <DesignCoresTab config={draft} onChange={updateDraft} />
            ) : null}
            {activeTab === 'tipografias' ? (
              <DesignTipografiasTab config={draft} onChange={updateDraft} />
            ) : null}
            {activeTab === 'categorias' ? (
              <DesignCategoriasTab
                config={draft}
                grupos={previewCategoriasGrupos}
                menuId={menuDeliveryId}
                hasMenu={hasMenu}
                isLoading={categoriasGruposLoading}
                isError={categoriasGruposError}
                onChange={updateDraft}
                onGruposChange={setPreviewCategoriasGrupos}
              />
            ) : null}
            {activeTab === 'notificacoes' ? <NotificacoesWhatsAppDeliveryTab /> : null}
            {activeTab === 'nome-cardapio' ? <DeliveryNomeCardapioView /> : null}
          </div>
        </div>

        {showPreview ? (
          <aside className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-gray-200 bg-gray-50 p-3 lg:w-[min(100%,26.25rem)] lg:max-w-[26.25rem] lg:flex-none lg:shrink-0 lg:border-l lg:border-t-0 lg:p-4 xl:w-[min(100%,27.5rem)] xl:max-w-[27.5rem]">
            <DeliveryMobilePreviewFrame
              config={draft}
              categoriasGrupos={previewCategoriasGrupos}
            />
          </aside>
        ) : null}
      </div>
    </div>
  )
}
