'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MdRefresh, MdSettingsBackupRestore } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
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
import {
  getDesignMigrationMarker,
  markDesignMigrated,
} from '../../shared/utils/designConfigStorage'
import { importDesignLocalToApi } from '../../shared/utils/importDesignLocalToApi'
import {
  isDesignLocalMigrationEnabled,
  shouldOfferDesignLocalMigration,
} from '../../shared/utils/shouldOfferDesignLocalMigration'
import { DesignOpenTabsBar, type DesignWorkspaceTabId } from '../components/DesignOpenTabsBar'
import { DesignSectionCards } from '../components/DesignSectionCards'
import { DeliveryMobilePreviewFrame } from '../components/DeliveryMobilePreviewFrame'
import { DesignCabecalhoTab } from '../components/tabs/DesignCabecalhoTab'
import { DesignModelosTab } from '../components/tabs/DesignModelosTab'
import { DesignCoresTab } from '../components/tabs/DesignCoresTab'
import { DesignTipografiasTab } from '../components/tabs/DesignTipografiasTab'
import { DesignCategoriasTab } from '../components/tabs/DesignCategoriasTab'
import { DesignRelacionadosTab } from '../components/tabs/DesignRelacionadosTab'
import { NotificacoesWhatsAppDeliveryTab } from '@/src/presentation/components/features/configuracoes/tabs/NotificacoesWhatsAppDeliveryTab'
import { DeliveryNomeCardapioView } from '@/src/presentation/components/features/delivery/hub/DeliveryNomeCardapioView'
import { useHydrateDesignCabecalhoMidia } from '../hooks/useHydrateDesignCabecalhoMidia'

export function DeliveryDesignCustomizerScreen() {
  const searchParams = useSearchParams()
  const { empresa, isLoading: empresaLoading } = useEmpresaMe()
  const { menuDeliveryId, isLoading: menuDeliveryLoading } = useMenuDeliveryId()
  const { data: empresaDelivery, isLoading: deliveryLoading } = useEmpresaDeliveryMe()
  const [openTabs, setOpenTabs] = useState<DesignSectionId[]>([])
  const [activeTab, setActiveTab] = useState<DesignWorkspaceTabId>('home')
  const [migrationOpen, setMigrationOpen] = useState(false)
  const [migrationBusy, setMigrationBusy] = useState(false)

  const nomeVitrineFallback =
    (empresaDelivery?.nomeExibicao?.trim() || empresa?.nomeExibicao || '').trim()

  const {
    draft,
    published,
    hydrated,
    isDirty,
    isAtDefaultDesign,
    updateDraft,
    publish,
    restore,
    applyDefaultDesign,
    replaceFromMe,
    salvarDraftAsync,
    publicarAsync,
    serverPublishedAt,
    isLoading: designLoading,
    isSavingDraft,
    isPublishing,
  } = useDeliveryDesignDraft({
    empresaId: empresa?.id,
    slug: empresaDelivery?.slug,
    nomeExibicaoFallback: nomeVitrineFallback,
    enabled: Boolean(empresa?.id),
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

  useEffect(() => {
    if (!hydrated || !empresa?.id || migrationOpen) return
    if (!isDesignLocalMigrationEnabled()) return

    const offer = shouldOfferDesignLocalMigration({
      empresaId: empresa.id,
      publishedAt: serverPublishedAt,
      serverDraft: draft,
      serverPublished: published,
      nomeExibicaoFallback: empresa.nomeExibicao ?? '',
    })
    if (offer) setMigrationOpen(true)
  }, [
    draft,
    empresa?.id,
    empresa?.nomeExibicao,
    hydrated,
    migrationOpen,
    published,
    serverPublishedAt,
  ])

  useHydrateDesignCabecalhoMidia({
    slug: empresaDelivery?.slug,
    hasEmpresaDelivery: Boolean(empresaDelivery),
    enabled: hydrated,
    publishedLogoUrl: published.cabecalho.logoUrl,
    publishedCapaUrl: published.cabecalho.capaUrl,
    onChange: updateDraft,
  })

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
  const busy = isSavingDraft || isPublishing || migrationBusy

  const handlePublish = useCallback(async () => {
    if (!canPublishDesign(draft) || busy) return
    try {
      await publish()
      showToast.success('Design publicado!')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível publicar o design.'
      showToast.error(msg)
    }
  }, [busy, draft, publish])

  const handleUndo = useCallback(async () => {
    if (busy) return
    try {
      await restore()
      showToast.success('Alterações desfeitas.')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível desfazer as alterações.'
      showToast.error(msg)
    }
  }, [busy, restore])

  const handleApplyDefaultDesign = useCallback(async () => {
    if (busy) return
    try {
      await applyDefaultDesign()
      showToast.success('Design padrão aplicado.')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível aplicar o design padrão.'
      showToast.error(msg)
    }
  }, [applyDefaultDesign, busy])

  const handleMigrationDismiss = useCallback(() => {
    if (!empresa?.id || migrationBusy) return
    if (getDesignMigrationMarker(empresa.id) !== 'imported') {
      markDesignMigrated(empresa.id, 'dismissed')
    }
    setMigrationOpen(false)
  }, [empresa?.id, migrationBusy])

  const handleMigrationConfirm = useCallback(async () => {
    if (!empresa?.id || migrationBusy) return
    setMigrationBusy(true)
    try {
      const me = await importDesignLocalToApi({
        empresaId: empresa.id,
        nomeExibicaoFallback: empresa.nomeExibicao ?? '',
        slug: empresaDelivery?.slug,
        salvarDraft: salvarDraftAsync,
        publicar: publicarAsync,
      })
      replaceFromMe(me)
      setMigrationOpen(false)
      showToast.success('Design deste aparelho importado para a conta.')
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Não foi possível importar o design local.'
      showToast.error(msg)
    } finally {
      setMigrationBusy(false)
    }
  }, [
    empresa?.id,
    empresa?.nomeExibicao,
    empresaDelivery?.slug,
    migrationBusy,
    publicarAsync,
    replaceFromMe,
    salvarDraftAsync,
  ])

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

  if (empresaLoading || deliveryLoading || menuDeliveryLoading || designLoading || !hydrated) {
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
      <JiffyConfirmDialog
        open={migrationOpen}
        onOpenChange={open => {
          if (!open) handleMigrationDismiss()
        }}
        title="Design salvo neste aparelho"
        description="Encontramos um design do cardápio salvo só neste navegador. Deseja importar para a conta? Assim o mesmo visual vale em qualquer dispositivo."
        cancelLabel="Agora não"
        confirmLabel={migrationBusy ? 'Importando…' : 'Importar'}
        busy={migrationBusy}
        onCancel={handleMigrationDismiss}
        onConfirm={() => void handleMigrationConfirm()}
      />

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
          {isSavingDraft && !isPublishing ? (
            <span className="text-xs font-medium text-gray-500">Salvando…</span>
          ) : null}
          <button
            type="button"
            onClick={() => void handleUndo()}
            disabled={!isDirty || busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdRefresh className="h-4 w-4" aria-hidden />
            Desfazer
          </button>
          <button
            type="button"
            onClick={() => void handleApplyDefaultDesign()}
            disabled={isAtDefaultDesign || busy}
            title="Aplica o visual padrão de fábrica (layout, cores, tipografia e categorias). Nome e mídia permanecem."
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdSettingsBackupRestore className="h-4 w-4" aria-hidden />
            Design padrão
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={!canPublish || busy}
            title={getPublishDisabledReason(draft)}
            className="inline-flex h-9 items-center rounded-lg bg-secondary px-5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing ? 'Publicando…' : 'Publicar'}
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
                nomeFantasiaFallback={empresa?.nomeExibicao ?? ''}
                nomeExibicaoDelivery={empresaDelivery?.nomeExibicao ?? null}
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
            {activeTab === 'relacionados' ? (
              <DesignRelacionadosTab
                grupos={previewCategoriasGrupos}
                menuId={menuDeliveryId}
                hasMenu={hasMenu}
                isLoading={categoriasGruposLoading}
                isError={categoriasGruposError}
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
