'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MdArrowBack, MdChevronRight } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useMenuDeliveryId } from '@/src/presentation/hooks/useMenuDeliveryId'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { showToast } from '@/src/shared/utils/toast'
import type { DesignTabId } from '../../shared/types/deliveryPublicoDesignConfig'
import {
  canPublishDesign,
  getPublishDisabledReason,
} from '../../shared/constants/designPublishRules'
import {
  DESIGN_SECTION_QUERY_KEY,
  DESIGN_TABS,
  designSectionTabId,
  deliveryHubDesignPath,
  deliveryHubDesignSectionPath,
  isDesignTabId,
} from '../../shared/constants/designTabs'
import { useDeliveryDesignDraft } from '../../shared/hooks/useDeliveryDesignDraft'
import { useDesignCategoriaGrupos } from '../../shared/hooks/useDesignCategoriaGrupos'
import type { DesignCategoriaGrupo } from '../../shared/types/designCategoriaGrupo'
import { mergeDesignCategoriaGrupos } from '../../shared/utils/mergeDesignCategoriaGrupos'
import { DeliveryMobilePreviewFrame } from '../components/DeliveryMobilePreviewFrame'
import { DesignCabecalhoTab } from '../components/tabs/DesignCabecalhoTab'
import { DesignModelosTab } from '../components/tabs/DesignModelosTab'
import { DesignCoresTab } from '../components/tabs/DesignCoresTab'
import { DesignTipografiasTab } from '../components/tabs/DesignTipografiasTab'
import { DesignCategoriasTab } from '../components/tabs/DesignCategoriasTab'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import {
  DELIVERY_HUB_PATH,
  DELIVERY_HUB_TAB_ID,
  getDeliveryEtapaById,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubEtapas'

function DesignSectionForm({
  activeSection,
  draft,
  slug,
  hasEmpresaDelivery,
  updateDraft,
  previewCategoriasGrupos,
  setPreviewCategoriasGrupos,
  menuDeliveryId,
  hasMenu,
  categoriasGruposLoading,
  categoriasGruposError,
}: {
  activeSection: DesignTabId
  draft: ReturnType<typeof useDeliveryDesignDraft>['draft']
  slug: string | undefined
  hasEmpresaDelivery: boolean
  updateDraft: ReturnType<typeof useDeliveryDesignDraft>['updateDraft']
  previewCategoriasGrupos: DesignCategoriaGrupo[]
  setPreviewCategoriasGrupos: React.Dispatch<React.SetStateAction<DesignCategoriaGrupo[]>>
  menuDeliveryId: string | null
  hasMenu: boolean
  categoriasGruposLoading: boolean
  categoriasGruposError: boolean
}) {
  if (activeSection === 'cabecalho') {
    return (
      <DesignCabecalhoTab
        config={draft}
        slug={slug}
        hasEmpresaDelivery={hasEmpresaDelivery}
        onChange={updateDraft}
      />
    )
  }
  if (activeSection === 'modelos') {
    return <DesignModelosTab config={draft} onChange={updateDraft} />
  }
  if (activeSection === 'cores') {
    return <DesignCoresTab config={draft} onChange={updateDraft} />
  }
  if (activeSection === 'tipografias') {
    return <DesignTipografiasTab config={draft} onChange={updateDraft} />
  }
  return (
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
  )
}

export function DeliveryDesignCustomizerScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toGestao } = useGestaoPath()
  const { empresa, isLoading: empresaLoading } = useEmpresaMe()
  const { menuDeliveryId, isLoading: menuDeliveryLoading } = useMenuDeliveryId()
  const { data: empresaDelivery, isLoading: deliveryLoading } = useEmpresaDeliveryMe()
  const setDeliveryHubTab = useTabsStore(s => s.setActiveTab)
  const addTab = useTabsStore(s => s.addTab)

  const secaoParam = searchParams.get(DESIGN_SECTION_QUERY_KEY)
  const activeSection = isDesignTabId(secaoParam) ? secaoParam : null

  const { draft, hydrated, isDirty, updateDraft, publish } = useDeliveryDesignDraft({
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

  const canSave = canPublishDesign(draft)
  const lojaEtapa = getDeliveryEtapaById('delivery-loja')
  const designEtapa = getDeliveryEtapaById('delivery-design')
  const sectionMeta = activeSection
    ? DESIGN_TABS.find(tab => tab.id === activeSection)
    : null

  const handleSave = useCallback(() => {
    if (!canPublishDesign(draft)) return
    publish()
    showToast.success('Design salvo! As alterações já valem no cardápio público.')
  }, [draft, publish])

  const voltarAoLobbyLoja = useCallback(() => {
    if (lojaEtapa) {
      addTab({ id: lojaEtapa.id, label: lojaEtapa.label, path: lojaEtapa.path })
      router.push(toGestao(lojaEtapa.path))
      return
    }
    setDeliveryHubTab(DELIVERY_HUB_TAB_ID)
    router.push(toGestao(DELIVERY_HUB_PATH))
  }, [addTab, lojaEtapa, router, setDeliveryHubTab, toGestao])

  const voltarAoLobbyDesign = useCallback(() => {
    if (designEtapa) {
      addTab({ id: designEtapa.id, label: designEtapa.label, path: designEtapa.path })
    }
    router.push(toGestao(deliveryHubDesignPath()))
  }, [addTab, designEtapa, router, toGestao])

  const abrirSecao = useCallback(
    (section: DesignTabId) => {
      const tabId = designSectionTabId(section)
      const secaoEtapa = getDeliveryEtapaById(tabId)
      const path = deliveryHubDesignSectionPath(section)
      if (secaoEtapa) {
        addTab({ id: secaoEtapa.id, label: secaoEtapa.label, path: secaoEtapa.path })
      } else {
        const tabMeta = DESIGN_TABS.find(tab => tab.id === section)
        addTab({ id: tabId, label: tabMeta?.label ?? section, path })
      }
      router.push(toGestao(path))
    },
    [addTab, router, toGestao]
  )

  if (empresaLoading || deliveryLoading || menuDeliveryLoading || !hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <JiffyLoading />
      </div>
    )
  }

  // Lobby e seções compartilham o mesmo shell: draft/preview ficam montados;
  // no lobby só ocultamos o painel de preview para ficar mais leve.
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:border-r lg:border-gray-200">
        {activeSection == null ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6">
            <div className="mb-6">
              <button
                type="button"
                onClick={voltarAoLobbyLoja}
                className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <MdArrowBack className="h-4 w-4" aria-hidden />
                Voltar à Loja
              </button>
              <h1 className="text-2xl font-bold text-primary sm:text-3xl">Design</h1>
              <p className="mt-1 max-w-2xl text-sm text-secondary-text">
                Escolha o que deseja personalizar no cardápio público.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DESIGN_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => abrirSecao(tab.id)}
                  className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    <tab.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-primary">{tab.label}</span>
                  <span className="mt-1 text-xs text-secondary-text">{tab.descricao}</span>
                  <span className="mt-3 inline-flex items-center text-xs font-semibold text-primary">
                    {tab.cta}
                    <MdChevronRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <header className="shrink-0 border-b border-gray-200 px-4 pt-2 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={voltarAoLobbyDesign}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition-colors hover:text-primary"
                >
                  <MdArrowBack className="h-4 w-4" aria-hidden />
                  Voltar
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave || !isDirty}
                    title={
                      getPublishDisabledReason(draft) ??
                      'Salva e aplica no cardápio público'
                    }
                    className="inline-flex h-9 items-center rounded-lg bg-secondary px-5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Salvar
                  </button>
                </div>
              </div>

              <h1 className="mt-1 pb-3 text-xl font-bold text-primary">
                {sectionMeta?.label ?? 'Design'}
              </h1>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
              <DesignSectionForm
                activeSection={activeSection}
                draft={draft}
                slug={empresaDelivery?.slug}
                hasEmpresaDelivery={Boolean(empresaDelivery)}
                updateDraft={updateDraft}
                previewCategoriasGrupos={previewCategoriasGrupos}
                setPreviewCategoriasGrupos={setPreviewCategoriasGrupos}
                menuDeliveryId={menuDeliveryId}
                hasMenu={hasMenu}
                categoriasGruposLoading={categoriasGruposLoading}
                categoriasGruposError={categoriasGruposError}
              />
            </div>
          </>
        )}
      </div>

      {activeSection != null ? (
        <aside className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-gray-200 bg-gray-50 p-3 lg:w-[min(100%,26.25rem)] lg:max-w-[26.25rem] lg:flex-none lg:shrink-0 lg:border-l lg:border-t-0 lg:p-4 xl:w-[min(100%,27.5rem)] xl:max-w-[27.5rem]">
          <DeliveryMobilePreviewFrame config={draft} categoriasGrupos={previewCategoriasGrupos} />
        </aside>
      ) : null}
    </div>
  )
}
