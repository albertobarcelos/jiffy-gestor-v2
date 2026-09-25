'use client'

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MdArrowBack } from 'react-icons/md'
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
  DESIGN_LEGACY_SECTIONS_TO_MODELOS_ABA,
  DESIGN_SECTION_QUERY_KEY,
  DESIGN_TABS,
  deliveryHubDesignPath,
  deliveryHubDesignModelosPath,
  deliveryHubDesignSectionPath,
  isDesignTabId,
} from '../../shared/constants/designTabs'
import { useDeliveryDesignDraft } from '../../shared/hooks/useDeliveryDesignDraft'
import { useDesignCategoriaGrupos } from '../../shared/hooks/useDesignCategoriaGrupos'
import type { DesignCategoriaGrupo } from '../../shared/types/designCategoriaGrupo'
import { mergeDesignCategoriaGrupos } from '../../shared/utils/mergeDesignCategoriaGrupos'
import { DeliveryMobilePreviewFrame } from '../components/DeliveryMobilePreviewFrame'
import { DesignSecoesCards } from '../components/DesignSecoesCards'
import { DesignCabecalhoTab } from '../components/tabs/DesignCabecalhoTab'
import { DesignModelosTab } from '../components/tabs/DesignModelosTab'
import { DesignCategoriasTab } from '../components/tabs/DesignCategoriasTab'
import { DeliveryNomeCardapioView } from '@/src/presentation/components/features/delivery/hub/DeliveryNomeCardapioView'

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
  setPreviewCategoriasGrupos: Dispatch<SetStateAction<DesignCategoriaGrupo[]>>
  menuDeliveryId: string | null
  hasMenu: boolean
  categoriasGruposLoading: boolean
  categoriasGruposError: boolean
}) {
  if (activeSection === 'cardapio') {
    return <DeliveryNomeCardapioView embedded />
  }
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
  if (activeSection === 'modelos' || activeSection === 'cores' || activeSection === 'tipografias') {
    return <DesignModelosTab config={draft} onChange={updateDraft} />
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

  const secaoParam = searchParams.get(DESIGN_SECTION_QUERY_KEY)
  const activeSection: DesignTabId | null = isDesignTabId(secaoParam) ? secaoParam : null
  const isLobby = activeSection == null
  const resolvedSectionId: DesignTabId | null =
    activeSection === 'cores' || activeSection === 'tipografias'
      ? 'modelos'
      : activeSection

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

  /** Legado ?secao=cores|tipografias → Modelos com aba correspondente. */
  useEffect(() => {
    if (secaoParam === 'cores' || secaoParam === 'tipografias') {
      router.replace(
        toGestao(
          deliveryHubDesignModelosPath(DESIGN_LEGACY_SECTIONS_TO_MODELOS_ABA[secaoParam])
        )
      )
    }
  }, [router, secaoParam, toGestao])

  /** Query inválida (ex.: ?secao=foo) → lobby de cards. */
  useEffect(() => {
    if (secaoParam != null && secaoParam !== '' && !isDesignTabId(secaoParam)) {
      router.replace(toGestao(deliveryHubDesignPath()))
    }
  }, [router, secaoParam, toGestao])

  const canSave = canPublishDesign(draft)
  const sectionMeta = resolvedSectionId
    ? DESIGN_TABS.find(tab => tab.id === resolvedSectionId)
    : undefined

  const handleSave = useCallback(() => {
    if (!canPublishDesign(draft)) return
    publish()
    showToast.success('Design salvo! As alterações já valem no cardápio público.')
  }, [draft, publish])

  const voltarAoLobbyCards = useCallback(() => {
    router.push(toGestao(deliveryHubDesignPath()))
  }, [router, toGestao])

  const abrirSecao = useCallback(
    (section: DesignTabId) => {
      router.push(toGestao(deliveryHubDesignSectionPath(section)))
    },
    [router, toGestao]
  )

  if (empresaLoading || deliveryLoading || menuDeliveryLoading || !hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:border-r lg:border-gray-200">
        {isLobby ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <DesignSecoesCards onAbrirSecao={abrirSecao} />
          </div>
        ) : (
          <>
            <header className="shrink-0 border-b border-gray-200 px-4 pt-2 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={voltarAoLobbyCards}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition-colors hover:text-primary"
                >
                  <MdArrowBack className="h-4 w-4" aria-hidden />
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave || !isDirty}
                  title={
                    getPublishDisabledReason(draft) ?? 'Salva e aplica no cardápio público'
                  }
                  className={
                    activeSection === 'cardapio'
                      ? 'hidden'
                      : 'inline-flex h-9 items-center rounded-lg bg-secondary px-5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50'
                  }
                >
                  Salvar
                </button>
              </div>

              <h1 className="mt-1 pb-3 text-xl font-bold text-primary">
                {sectionMeta?.label ?? 'Personalizar Loja'}
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

      <aside className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-gray-200 bg-gray-50 p-3 lg:w-[min(100%,26.25rem)] lg:max-w-[26.25rem] lg:flex-none lg:shrink-0 lg:border-l lg:border-t-0 lg:p-4 xl:w-[min(100%,27.5rem)] xl:max-w-[27.5rem]">
        <DeliveryMobilePreviewFrame config={draft} categoriasGrupos={previewCategoriasGrupos} />
      </aside>
    </div>
  )
}
