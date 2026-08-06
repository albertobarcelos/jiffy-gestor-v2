'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MdArrowBack, MdRefresh } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { showToast } from '@/src/shared/utils/toast'
import type { DesignTabId } from '../../shared/types/deliveryPublicoDesignConfig'
import {
  canPublishDesign,
  getPublishDisabledReason,
} from '../../shared/constants/designPublishRules'
import { useDeliveryDesignDraft } from '../../shared/hooks/useDeliveryDesignDraft'
import { useDesignCategoriaGrupos } from '../../shared/hooks/useDesignCategoriaGrupos'
import { useDesignCategoriaGruposImagens } from '../../shared/hooks/useDesignCategoriaGruposImagens'
import type { DesignCategoriaGrupo } from '../../shared/types/designCategoriaGrupo'
import { mergeDesignCategoriaGrupos } from '../../shared/utils/mergeDesignCategoriaGrupos'
import { markDesignMigrated, getDesignMigrationMarker } from '../../shared/utils/designConfigStorage'
import { importDesignLocalToApi } from '../../shared/utils/importDesignLocalToApi'
import {
  isDesignLocalMigrationEnabled,
  shouldOfferDesignLocalMigration,
} from '../../shared/utils/shouldOfferDesignLocalMigration'
import { DesignTabNav } from '../components/DesignTabNav'
import { DeliveryMobilePreviewFrame } from '../components/DeliveryMobilePreviewFrame'
import { DesignCabecalhoTab } from '../components/tabs/DesignCabecalhoTab'
import { DesignModelosTab } from '../components/tabs/DesignModelosTab'
import { DesignCoresTab } from '../components/tabs/DesignCoresTab'
import { DesignTipografiasTab } from '../components/tabs/DesignTipografiasTab'
import { DesignCategoriasTab } from '../components/tabs/DesignCategoriasTab'
import { DesignRelacionadosTab } from '../components/tabs/DesignRelacionadosTab'

export function DeliveryDesignCustomizerScreen() {
  const { empresa, isLoading: empresaLoading } = useEmpresaMe()
  const { data: empresaDelivery, isLoading: deliveryLoading } = useEmpresaDeliveryMe()
  const [activeTab, setActiveTab] = useState<DesignTabId>('cabecalho')
  const [migrationOpen, setMigrationOpen] = useState(false)
  const [migrationBusy, setMigrationBusy] = useState(false)

  const {
    draft,
    published,
    hydrated,
    isDirty,
    updateDraft,
    publish,
    restore,
    replaceFromMe,
    salvarDraftAsync,
    publicarAsync,
    serverPublishedAt,
    isLoading: designLoading,
    isError: designError,
    error: designLoadError,
    refetch: refetchDesign,
    isSavingDraft,
    isPublishing,
  } = useDeliveryDesignDraft({
    empresaId: empresa?.id,
    slug: empresaDelivery?.slug,
    nomeExibicaoFallback: empresa?.nomeExibicao ?? '',
    enabled: Boolean(empresa?.id),
  })

  const {
    grupos: categoriasGrupos,
    isLoading: categoriasGruposLoading,
    isError: categoriasGruposError,
  } = useDesignCategoriaGrupos(Boolean(empresa?.id))

  const [previewCategoriasGrupos, setPreviewCategoriasGrupos] = useState<
    DesignCategoriaGrupo[]
  >([])

  useEffect(() => {
    setPreviewCategoriasGrupos(previous =>
      mergeDesignCategoriaGrupos(categoriasGrupos, previous)
    )
  }, [categoriasGrupos])

  const handlePreviewImagensResolved = useCallback(
    (resolved: DesignCategoriaGrupo[]) => {
      setPreviewCategoriasGrupos(previous =>
        mergeDesignCategoriaGrupos(resolved, previous)
      )
    },
    []
  )

  useDesignCategoriaGruposImagens({
    grupos: previewCategoriasGrupos,
    enabled:
      Boolean(draft.categorias.tituloGrupoFundo === 'imagem') &&
      hydrated &&
      previewCategoriasGrupos.length > 0,
    onResolved: handlePreviewImagensResolved,
  })

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

  const handleRestore = useCallback(async () => {
    if (busy) return
    try {
      await restore()
      showToast.success('Design restaurado.')
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Não foi possível restaurar o design.'
      showToast.error(msg)
    }
  }, [busy, restore])

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

  if (empresaLoading || deliveryLoading || designLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <JiffyLoading />
      </div>
    )
  }

  if (!empresaDelivery) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <header className="shrink-0 border-b border-gray-200 px-4 py-3 md:px-6">
          <Link
            href="/configuracoes/empresa-delivery"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition-colors hover:text-primary"
          >
            <MdArrowBack className="h-4 w-4" aria-hidden />
            Voltar
          </Link>
          <h1 className="mt-2 text-xl font-bold text-primary">Design</h1>
        </header>
        <div className="p-4 md:p-6">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ative a Empresa Delivery antes de personalizar o design do cardápio.
          </p>
        </div>
      </div>
    )
  }

  if (designError) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <header className="shrink-0 border-b border-gray-200 px-4 py-3 md:px-6">
          <Link
            href="/configuracoes/empresa-delivery"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition-colors hover:text-primary"
          >
            <MdArrowBack className="h-4 w-4" aria-hidden />
            Voltar
          </Link>
          <h1 className="mt-2 text-xl font-bold text-primary">Design</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <p className="text-center text-sm text-primary-text">
            {designLoadError?.message ||
              'Não foi possível carregar o design. Tente novamente.'}
          </p>
          <button
            type="button"
            onClick={() => void refetchDesign()}
            className="inline-flex h-9 items-center rounded-lg bg-secondary px-5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white lg:flex-row">
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:border-r lg:border-gray-200">
        <header className="shrink-0 border-b border-gray-200 px-4 pt-2 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/configuracoes/empresa-delivery"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition-colors hover:text-primary"
            >
              <MdArrowBack className="h-4 w-4" aria-hidden />
              Voltar
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              {isSavingDraft && !isPublishing ? (
                <span className="text-xs font-medium text-gray-500">Salvando…</span>
              ) : null}
              <button
                type="button"
                onClick={() => void handleRestore()}
                disabled={!isDirty || busy}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdRefresh className="h-4 w-4" aria-hidden />
                Restaurar design
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
          </div>

          <h1 className="mt-1 text-xl font-bold text-primary">Design</h1>
          <div className="mt-1">
            <DesignTabNav activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
          {activeTab === 'cabecalho' && (
            <DesignCabecalhoTab
              config={draft}
              slug={empresaDelivery?.slug}
              hasEmpresaDelivery={Boolean(empresaDelivery)}
              onChange={updateDraft}
            />
          )}
          {activeTab === 'modelos' && (
            <DesignModelosTab config={draft} onChange={updateDraft} />
          )}
          {activeTab === 'cores' && (
            <DesignCoresTab config={draft} onChange={updateDraft} />
          )}
          {activeTab === 'tipografias' && (
            <DesignTipografiasTab config={draft} onChange={updateDraft} />
          )}
          {activeTab === 'categorias' && (
            <DesignCategoriasTab
              config={draft}
              grupos={previewCategoriasGrupos}
              isLoading={categoriasGruposLoading}
              isError={categoriasGruposError}
              onChange={updateDraft}
              onGruposChange={setPreviewCategoriasGrupos}
            />
          )}
          {activeTab === 'relacionados' && (
            <DesignRelacionadosTab
              grupos={previewCategoriasGrupos}
              isLoading={categoriasGruposLoading}
              isError={categoriasGruposError}
            />
          )}
        </div>
      </div>

      <aside className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-gray-200 bg-gray-50 p-3 lg:w-[min(100%,26.25rem)] lg:max-w-[26.25rem] lg:flex-none lg:shrink-0 lg:border-l lg:border-t-0 lg:p-4 xl:w-[min(100%,27.5rem)] xl:max-w-[27.5rem]">
        <DeliveryMobilePreviewFrame
          config={draft}
          categoriasGrupos={previewCategoriasGrupos}
        />
      </aside>
    </div>
  )
}
