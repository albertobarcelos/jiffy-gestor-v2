'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { useGruposComplementosInfinite } from '@/src/presentation/hooks/useGruposComplementos'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  CadastroListHeader,
  CadastroListHeaderLabel,
  CadastroListRow,
  CadastroListShell,
  CadastroListThumbSpacer,
  EntityListThumbnail,
} from '@/src/presentation/components/ui/cadastro-list'
import {
  MdSearch,
  MdExtension,
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
  MdImageNotSupported,
  MdPhotoCamera,
} from 'react-icons/md'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { showToast } from '@/src/shared/utils/toast'
import { DELIVERY_IMAGE_ACCEPT } from '@/src/shared/constants/deliveryImageUpload'
import {
  fetchGrupoComplementoImagemUrl,
  fetchGruposComplementoImagemUrlsBatch,
  mensagemLegivelDeliveryMediaError,
  uploadGrupoComplementoImagem,
} from '@/src/infrastructure/api/deliveryMediaApi'
import { DELIVERY_GRUPO_COMPLEMENTO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import { useEntityImageCropUpload } from '@/src/presentation/hooks/useEntityImageCropUpload'
import {
  GruposComplementosTabsModal,
  GruposComplementosTabsModalState,
} from './GruposComplementosTabsModal'

interface GruposComplementosListProps {
  onReload?: () => void
}

function stopRowInteraction(e: React.SyntheticEvent) {
  e.stopPropagation()
}

function GrupoImagemThumb({
  nome,
  imagemUrl,
  isUploading,
  onSelectFile,
}: {
  nome: string
  imagemUrl?: string | null
  isUploading?: boolean
  onSelectFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const openFilePicker = useCallback(() => {
    if (isUploading) return
    inputRef.current?.click()
  }, [isUploading])

  return (
    <div
      className="relative h-11 w-11 shrink-0 md:h-12 md:w-12"
      onClick={stopRowInteraction}
      onMouseDown={stopRowInteraction}
    >
      <input
        ref={inputRef}
        type="file"
        accept={DELIVERY_IMAGE_ACCEPT}
        className="hidden"
        onClick={e => e.stopPropagation()}
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onSelectFile(file)
        }}
      />
      {imagemUrl ? (
        <>
          <EntityListThumbnail src={imagemUrl} alt={nome} />
          <button
            type="button"
            title="Trocar imagem"
            aria-label={`Trocar imagem de ${nome}`}
            disabled={isUploading}
            onClick={e => {
              stopRowInteraction(e)
              openFilePicker()
            }}
            className="absolute -bottom-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-primary text-white shadow disabled:cursor-wait disabled:opacity-60"
          >
            <MdPhotoCamera className="h-3 w-3" />
          </button>
        </>
      ) : (
        <button
          type="button"
          title={`Inserir imagem de ${nome}`}
          aria-label={`Inserir imagem de ${nome}`}
          disabled={isUploading}
          onClick={e => {
            stopRowInteraction(e)
            openFilePicker()
          }}
          className="relative flex h-full w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-secondary-text transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          <MdImageNotSupported className="h-6 w-6 md:h-7 md:w-7" />
        </button>
      )}
      {isUploading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/35">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Item individual da lista de grupos (memoizado para evitar re-renders desnecessários)
 */
const GrupoItem = memo(function GrupoItem({
  grupo,
  onToggleStatus,
  onOpenComplementosModal,
  onEditGrupo,
  onChangeQuantidade,
  isChangingQuantidade,
  rowIndex,
  imagemUrl,
  isUploadingImagem,
  onUploadImagem,
}: {
  grupo: GrupoComplemento
  onToggleStatus?: (grupoId: string, novoStatus: boolean) => void
  onOpenComplementosModal?: (grupo: GrupoComplemento) => void
  onEditGrupo?: (grupo: GrupoComplemento) => void
  onChangeQuantidade?: (grupo: GrupoComplemento, tipo: 'min' | 'max', delta: number) => void
  isChangingQuantidade?: boolean
  rowIndex: number
  imagemUrl?: string | null
  isUploadingImagem?: boolean
  onUploadImagem?: (grupoId: string, file: File) => void
}) {
  const complementos = useMemo(() => grupo.getComplementos() || [], [grupo])
  const complementosIds = useMemo(() => grupo.getComplementosIds() || [], [grupo])
  const isAtivo = useMemo(() => grupo.isAtivo(), [grupo])
  const qtdComplementos = complementos.length || complementosIds.length

  const handleRowClick = useCallback(() => {
    onEditGrupo?.(grupo)
  }, [grupo, onEditGrupo])

  const actionBtnBase =
    'inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 text-xs font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/80'

  return (
    <CadastroListRow
      variant="grupos-complementos"
      index={rowIndex}
      onClick={handleRowClick}
    >
      <GrupoImagemThumb
        nome={grupo.getNome()}
        imagemUrl={imagemUrl}
        isUploading={isUploadingImagem}
        onSelectFile={file => onUploadImagem?.(grupo.getId(), file)}
      />

      <span
        className="min-w-0 truncate font-normal text-xs text-primary-text md:text-sm"
        title={grupo.getNome()}
      >
        {grupo.getNome()}
      </span>

      <div className="hidden items-center justify-center md:flex" onClick={e => e.stopPropagation()}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            {
              label: 'Qtd mín.',
              valor: grupo.getQtdMinima(),
              tipo: 'min' as const,
              invertButtons: true,
            },
            {
              label: 'Qtd máx.',
              valor: grupo.getQtdMaxima(),
              tipo: 'max' as const,
              invertButtons: false,
            },
          ].map(item => (
            <div
              key={`${grupo.getId()}-${item.tipo}`}
              className={`flex items-center gap-1.5 ${item.invertButtons ? 'flex-row-reverse' : ''}`}
            >
              <div className="flex min-w-[3.5rem] flex-col items-center text-center text-xs text-secondary-text">
                <span className="tracking-wide">{item.label}</span>
                <span className="text-sm font-normal text-primary-text">{item.valor}</span>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label={`Aumentar ${item.label}`}
                  disabled={isChangingQuantidade}
                  onClick={() => onChangeQuantidade?.(grupo, item.tipo, 1)}
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-gray-300 text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  <MdKeyboardArrowUp />
                </button>
                <button
                  type="button"
                  aria-label={`Diminuir ${item.label}`}
                  disabled={isChangingQuantidade}
                  onClick={() => onChangeQuantidade?.(grupo, item.tipo, -1)}
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-gray-300 text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  <MdKeyboardArrowDown />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-center" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          aria-label={`Editar complementos do grupo ${grupo.getNome()}`}
          title="Editar complementos"
          onClick={() => onOpenComplementosModal?.(grupo)}
          className={`${actionBtnBase} max-w-full border-secondary/60 bg-white text-secondary hover:bg-secondary/10`}
        >
          <MdExtension className="shrink-0 text-base" />
          <span className="truncate">
            {qtdComplementos === 0
              ? 'Editar Complementos'
              : `Editar ${qtdComplementos} Complementos`}
          </span>
        </button>
      </div>

      <div
        className="flex items-center justify-center"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        <JiffyIconSwitch
          checked={isAtivo}
          onChange={e => {
            e.stopPropagation()
            onToggleStatus?.(grupo.getId(), e.target.checked)
          }}
          bordered={false}
          size="sm"
          className="shrink-0"
          inputProps={{
            'aria-label': isAtivo
              ? 'Desativar grupo de complementos'
              : 'Ativar grupo de complementos',
          }}
        />
      </div>
    </CadastroListRow>
  )
})

export function GruposComplementosList({ onReload }: GruposComplementosListProps) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos')
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText])

  const ativoFilter = useMemo<boolean | null>(() => {
    return filterStatus === 'Ativo' ? true : filterStatus === 'Inativo' ? false : null
  }, [filterStatus])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useGruposComplementosInfinite({
    q: debouncedSearch || undefined,
    ativo: ativoFilter,
    limit: 10,
  })

  useEffect(() => {
    if (!isLoading && !isFetching) {
      setHasLoadedOnce(true)
    }
  }, [isLoading, isFetching])

  const grupos = useMemo(() => {
    return data?.pages.flatMap((page) => page.grupos) || []
  }, [data])

  const totalGrupos = useMemo(() => {
    return data?.pages[0]?.count || 0
  }, [data])

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      return
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) return

      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)

      if (distanceFromBottom < 400) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }

      scrollTimeoutRef.current = null
    }, 100)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll])

  useEffect(() => {
    if (!hasNextPage) {
      return
    }

    if (!isFetching && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetching, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar grupos de complementos:', error)
    }
  }, [error])

  const [updatingQuantidadeId, setUpdatingQuantidadeId] = useState<string | null>(null)
  const [imagensPorGrupoId, setImagensPorGrupoId] = useState<Record<string, string | null>>({})
  const [uploadingImagemGrupoId, setUploadingImagemGrupoId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const invalidate = useInvalidateTenantQueries()

  useEffect(() => {
    const idsFaltantes = grupos
      .map(g => g.getId())
      .filter(id => !(id in imagensPorGrupoId))

    if (idsFaltantes.length === 0) return

    let cancelled = false
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    void fetchGruposComplementoImagemUrlsBatch(idsFaltantes, token).then(resolved => {
      if (cancelled) return
      setImagensPorGrupoId(prev => ({ ...prev, ...resolved }))
    })

    return () => {
      cancelled = true
    }
  }, [grupos, imagensPorGrupoId])

  const handleUploadImagem = useCallback(
    async (grupoId: string, file: File) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      setUploadingImagemGrupoId(grupoId)
      const toastId = showToast.loading('Enviando imagem...')

      try {
        await uploadGrupoComplementoImagem(grupoId, file, token)
        const persistedUrl = await fetchGrupoComplementoImagemUrl(grupoId, token)
        setImagensPorGrupoId(prev => ({
          ...prev,
          [grupoId]: persistedUrl,
        }))
        showToast.successLoading(toastId, 'Imagem salva com sucesso!')
      } catch (error) {
        showToast.errorLoading(toastId, mensagemLegivelDeliveryMediaError(error))
      } finally {
        setUploadingImagemGrupoId(null)
      }
    },
    []
  )

  const { selectForEntity: selectGrupoComplementoImagem, cropModal: grupoComplementoCropModal } =
    useEntityImageCropUpload({
      preset: DELIVERY_GRUPO_COMPLEMENTO_CROP_PRESET,
      upload: handleUploadImagem,
    })

  const [tabsModalState, setTabsModalState] = useState<GruposComplementosTabsModalState>({
    open: false,
    tab: 'grupo',
    mode: 'create',
    grupo: undefined,
  })

  const handleActionsReload = useCallback(async () => {
    await refetch()
    onReload?.()
  }, [refetch, onReload])

  const toggleGroupStatus = useCallback(
    async (grupoId: string, novoStatus: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      try {
        const response = await fetchGestorApi(`/api/grupos-complementos/${grupoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar status do grupo')
        }

        showToast.success(
          novoStatus
            ? 'Grupo de complementos ativado com sucesso!'
            : 'Grupo de complementos desativado com sucesso!'
        )
        await handleActionsReload()
      } catch (error: any) {
        console.error('Erro ao atualizar status do grupo:', error)
        showToast.error(error.message || 'Erro ao atualizar status do grupo')
      }
    },
    [handleActionsReload]
  )

  const openTabsModal = useCallback(
    (config: Partial<GruposComplementosTabsModalState>) => {
      setTabsModalState(() => ({
        open: true,
        tab: config.tab ?? 'grupo',
        mode: config.mode ?? 'create',
        grupo: config.grupo,
      }))

      const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
      currentSearchParams.set('modalComplementoOpen', 'true')
      router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    },
    [router, searchParams, pathname]
  )

  const closeTabsModal = useCallback(async () => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
    }))

    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalComplementoOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh()
    await invalidate(['grupos-complementos'])
  }, [router, searchParams, pathname, invalidate])

  const handleTabsModalReload = useCallback(async () => {
    setImagensPorGrupoId({})
    await handleActionsReload()
  }, [handleActionsReload])

  const handleTabsModalTabChange = useCallback((tab: 'grupo' | 'complementos') => {
    setTabsModalState((prev) => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleOpenComplementosModal = useCallback(
    (grupo: GrupoComplemento) => {
      openTabsModal({
        tab: 'complementos',
        mode: 'edit',
        grupo,
      })
    },
    [openTabsModal]
  )

  const handleEditGrupo = useCallback(
    (grupo: GrupoComplemento) => {
      const grupoId = grupo.getId()
      if (tabsModalState.open && tabsModalState.grupo?.getId() === grupoId) {
        handleTabsModalTabChange('grupo')
        return
      }
      openTabsModal({
        tab: 'grupo',
        mode: 'edit',
        grupo,
      })
    },
    [handleTabsModalTabChange, openTabsModal, tabsModalState.grupo, tabsModalState.open]
  )

  const handleChangeQuantidade = useCallback(
    async (grupo: GrupoComplemento, tipo: 'min' | 'max', delta: number) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      let novoMin = grupo.getQtdMinima()
      let novoMax = grupo.getQtdMaxima()

      if (tipo === 'min') {
        novoMin = Math.max(0, novoMin + delta)
        if (novoMin > novoMax) {
          novoMax = novoMin
        }
      } else {
        novoMax = Math.max(0, novoMax + delta)
        if (novoMax < novoMin) {
          novoMin = novoMax
        }
      }

      if (novoMin === grupo.getQtdMinima() && novoMax === grupo.getQtdMaxima()) {
        return
      }

      setUpdatingQuantidadeId(grupo.getId())

      try {
        const response = await fetchGestorApi(`/api/grupos-complementos/${grupo.getId()}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ qtdMinima: novoMin, qtdMaxima: novoMax }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar quantidades do grupo')
        }

        showToast.success('Quantidades atualizadas com sucesso!')
        await handleActionsReload()
      } catch (error: any) {
        console.error('Erro ao atualizar quantidades do grupo:', error)
        showToast.error(error.message || 'Erro ao atualizar quantidades do grupo')
      } finally {
        setUpdatingQuantidadeId(null)
      }
    },
    [handleActionsReload]
  )

  return (
    <div className="flex h-full flex-col">
      <CadastroListShell className="flex min-h-0 flex-1 flex-col px-2 md:px-[30px]">
      <div className="flex-shrink-0 py-[4px]">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col md:pl-5">
            <p className="text-primary text-lg font-semibold">
              Grupos de Complementos Cadastrados
            </p>
            <p className="text-tertiary md:text-[22px] text-sm font-normal">
              Total {grupos.length} de {totalGrupos}
            </p>
          </div>
          <button
            onClick={() =>
              openTabsModal({
                tab: 'grupo',
                mode: 'create',
                grupo: undefined,
              })
            }
            className="h-8 md:px-[30px] px-4 bg-primary text-info rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>
      <div className="h-[2px] border-t-2 border-primary/70 flex-shrink-0"></div>
      <div className="flex gap-3 py-1 flex-shrink-0">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
          <div className="relative h-8">
            <input
              id="grupos-complementos-search"
              type="text"
              placeholder="Pesquisar grupo..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full h-full px-5 pl-12 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
              <MdSearch size={18} />
            </span>
          </div>
        </div>

        <div className="w-full flex gap-1 items-center sm:w-[160px]">
          <label className="text-xs font-semibold text-secondary-text mb-1 block">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Inativo')}
            className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm"
          >
            <option value="Todos">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      <div className="flex-shrink-0">
        <CadastroListHeader variant="grupos-complementos">
          <CadastroListThumbSpacer />
          <CadastroListHeaderLabel>Nome</CadastroListHeaderLabel>
          <CadastroListHeaderLabel hideOnMobile className="justify-center text-center">
            Qtd mín. / máx.
          </CadastroListHeaderLabel>
          <CadastroListHeaderLabel className="text-center">Complementos</CadastroListHeaderLabel>
          <CadastroListHeaderLabel className="text-center">Status</CadastroListHeaderLabel>
        </CadastroListHeader>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-2 pt-2 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 250px)' }}
      >
        {(isLoading || (grupos.length === 0 && isFetching)) && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <JiffyLoading />
          </div>
        )}

        {grupos.length === 0 && !isLoading && !isFetching && hasLoadedOnce && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum grupo de complementos encontrado.</p>
          </div>
        )}

        {grupos.map((grupo, index) => (
          <GrupoItem
            key={grupo.getId()}
            grupo={grupo}
            onToggleStatus={toggleGroupStatus}
            onOpenComplementosModal={handleOpenComplementosModal}
            onEditGrupo={handleEditGrupo}
            onChangeQuantidade={handleChangeQuantidade}
            isChangingQuantidade={updatingQuantidadeId === grupo.getId()}
            rowIndex={index}
            imagemUrl={imagensPorGrupoId[grupo.getId()] ?? null}
            isUploadingImagem={uploadingImagemGrupoId === grupo.getId()}
            onUploadImagem={selectGrupoComplementoImagem}
          />
        ))}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <GruposComplementosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onReload={handleTabsModalReload}
        onTabChange={handleTabsModalTabChange}
      />
      {grupoComplementoCropModal}
      </CadastroListShell>
    </div>
  )
}
