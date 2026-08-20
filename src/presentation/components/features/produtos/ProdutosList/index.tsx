'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

import { useProdutosInfinite } from '@/src/presentation/hooks/useProdutos'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { useProdutoPatchMutation, isSavingOf } from '@/src/presentation/hooks/useProdutoPatchMutation'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import { useProdutosFilters } from '@/src/presentation/hooks/useProdutosFilters'
import { useIsMobile } from '@/src/presentation/hooks/useIsMobile'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useEntityImageCropUpload } from '@/src/presentation/hooks/useEntityImageCropUpload'
import { MENU_PRODUTO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import {
  aplicarImagemProdutoNosMenus,
  buscarIdMenuPrincipal,
  buscarMenusDaEmpresa,
  unirMenuIds,
} from '@/src/presentation/utils/uploadImagemProdutoMenus'

import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { ProdutosTabsModal, type ProdutosTabsModalState } from '../ProdutosTabsModal'
import {
  EscolherTipoProdutoModal,
  useEscolherTipoProdutoCadastro,
} from '../EscolherTipoProdutoModal'
import { ProdutoNovoWizard } from '../ProdutoNovoWizard'
import { ProdutosHeader } from './ProdutosHeader'
import { ProdutosFilters } from './ProdutosFilters'
import { ProdutoListItem } from './ProdutoListItem'
import { useImagensProdutosCadastroBase } from '@/src/presentation/hooks/produtos/useImagensProdutosCadastroBase'

import { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import {
  sortProdutosAlphabetically,
  produtoFromApiPreservandoOrdem,
} from './utils'

// ---------------------------------------------------------------------------
// Tipos auxiliares para o cache do React Query
// ---------------------------------------------------------------------------

interface InfinitePage {
  produtos: Produto[]
  count?: number
}

interface InfinitePagesData {
  pages?: InfinitePage[]
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ProdutosList() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  const { state: filters, actions, queryParams, filterStatus } = useProdutosFilters()

  // Sempre inicia como `false` para coincidir com o SSR; corrigido após hidratação via useIsMobile.
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false)
  useEffect(() => { setFiltrosVisiveis(!isMobile) }, [isMobile])

  const [tabsModalState, setTabsModalState] = useState<ProdutosTabsModalState>({
    open: false, tab: 'produto', mode: 'create',
    prefillGrupoProdutoId: undefined, grupoId: undefined,
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const patchMutation = useProdutoPatchMutation()
  const tipoCadastro = useEscolherTipoProdutoCadastro()
  const [wizardOpen, setWizardOpen] = useState(false)
  const { pedirConfirmacao, aplicarNosDestinos, aplicarImagemNosDestinos, dialog: dialogPropagacao } =
    usePropagarAlteracaoProduto()
  const [savingImageProdutoId, setSavingImageProdutoId] = useState<string | null>(null)

  const { data: gruposProdutos = [], isLoading: isLoadingGruposProdutos } = useGruposProdutos({ limit: 100, ativo: null })
  const { data: gruposComplementos = [], isLoading: isLoadingGruposComplementos } = useGruposComplementos({ limit: 100, ativo: null })

  const gruposProdutosFiltrados = useMemo(() => {
    if (filters.statusGrupoFilter === 'Ativo') {
      return gruposProdutos.filter((g) => g.isAtivo())
    }
    if (filters.statusGrupoFilter === 'Desativado') {
      return gruposProdutos.filter((g) => !g.isAtivo())
    }
    return gruposProdutos
  }, [gruposProdutos, filters.statusGrupoFilter])

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isLoading, error } =
    useProdutosInfinite(queryParams)
  const { data: imagensPorProdutoId = {} } = useImagensProdutosCadastroBase()

  // Produtos achatados + sem duplicatas
  const produtos = useMemo(() => {
    if (!data?.pages) return []
    const map = new Map<string, Produto>()
    data.pages.forEach((page) => page.produtos.forEach((p) => { if (!map.has(p.getId())) map.set(p.getId(), p) }))
    let list = Array.from(map.values())
    if (queryParams.grupoComplementosId === undefined && filters.grupoComplementoFilter === '__none__') {
      list = list.filter((p) => !p.getGruposComplementos()?.length)
    }
    return list
  }, [data, queryParams.grupoComplementosId, filters.grupoComplementoFilter])

  const totalProdutos = useMemo(() => data?.pages?.[0]?.count ?? 0, [data])

  // Map consolidado: ativo por grupoId (filtro Status categoria + opções do Autocomplete).
  const grupoProdutoMap = useMemo(() => {
    const map = new Map<string, { ativo: boolean }>()
    gruposProdutos.forEach((g) => map.set(g.getId(), { ativo: g.isAtivo() }))
    return map
  }, [gruposProdutos])

  const produtosVisiveis = useMemo(() => {
    const sorted = sortProdutosAlphabetically(produtos)

    if (filters.statusGrupoFilter === 'Todos') return sorted

    return sorted.filter((p) => {
      const grupoId = p.getGrupoId()
      if (!grupoId) {
        // "Sem grupo" só aparece quando o filtro de status do grupo é Ativo/Todos
        return filters.statusGrupoFilter === 'Ativo'
      }
      const ativo = grupoProdutoMap.get(grupoId)?.ativo
      if (typeof ativo !== 'boolean') return filters.statusGrupoFilter === 'Ativo'
      return filters.statusGrupoFilter === 'Ativo' ? ativo : !ativo
    })
  }, [produtos, grupoProdutoMap, filters.statusGrupoFilter])

  // Scroll infinito: carrega próxima página quando o usuário chega perto do fim
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetching && data) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, data])

  useEffect(() => {
    if (error) console.error('Erro ao carregar produtos:', error)
  }, [error])

  // Volta ao topo ao trocar filtros/busca
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 })
  }, [queryParams])

  // Modal helpers
  const openTabsModal = useCallback(
    (config: Partial<ProdutosTabsModalState>) => {
      setTabsModalState({
        open: true,
        tab: 'produto',
        mode: 'create',
        ...config,
      })
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      params.set('modalOpen', 'true')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, searchParams, pathname]
  )

  const closeTabsModal = useCallback(() => {
    setTabsModalState({
      open: false,
      tab: 'produto',
      mode: 'create',
      prefillGrupoProdutoId: undefined,
      grupoId: undefined,
    })
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.delete('modalOpen')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const openWizardCadastro = useCallback(() => {
    setWizardOpen(true)
  }, [])

  const closeWizardCadastro = useCallback(() => {
    setWizardOpen(false)
  }, [])
  const updateProdutoInCache = useCallback((produtoId: string, produtoData: unknown) => {
    if (!empresaId) return
    queryClient.setQueriesData<InfinitePagesData>(
      { queryKey: ['tenant', empresaId, 'produtos', 'infinite'], exact: false },
      (oldData) => {
        if (!oldData?.pages) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            produtos: page.produtos.map((p) => {
              if (p.getId() !== produtoId) return p
              try {
                return produtoFromApiPreservandoOrdem(p, produtoData)
              } catch {
                return p
              }
            }),
          })),
        }
      }
    )
  }, [queryClient, empresaId])

  const handleTabsModalReload = useCallback((produtoId?: string, produtoData?: unknown) => {
    if (produtoId && produtoData) {
      updateProdutoInCache(produtoId, produtoData)
      return
    }
    if (!empresaId) return
    void queryClient.invalidateQueries({
      queryKey: ['tenant', empresaId, 'produtos', 'infinite'],
      exact: false,
      refetchType: 'active',
    })
    void queryClient.invalidateQueries({
      queryKey: ['tenant', empresaId, 'grupos-produtos'],
      exact: false,
      refetchType: 'active',
    })
  }, [queryClient, empresaId, updateProdutoInCache])

  // Handlers de produto — recebem produtoId como arg, sem closure por item
  const handleValorChange = useCallback(async (produtoId: string, novoValor: number) => {
    const destinos = await pedirConfirmacao({ origem: 'cadastroBase', produtoId })
    if (destinos === null) return
    patchMutation.mutate(
      { type: 'valor', produtoId, novoValor },
      {
        onSuccess: () => {
          if (destinos.menuIds.length === 0) return
          void aplicarNosDestinos({
            produtoId,
            snapshot: { valor: novoValor },
            destinos: { aplicarNoCadastroBase: false, menuIds: destinos.menuIds },
          })
        },
      }
    )
  }, [patchMutation, pedirConfirmacao, aplicarNosDestinos])

  const handleStatusToggle = useCallback(async (produtoId: string, novoStatus: boolean) => {
    const destinos = await pedirConfirmacao({ origem: 'cadastroBase', produtoId })
    if (destinos === null) return
    patchMutation.mutate(
      { type: 'status', produtoId, novoStatus, filterStatus },
      {
        onSuccess: () => {
          if (destinos.menuIds.length === 0) return
          void aplicarNosDestinos({
            produtoId,
            snapshot: { ativo: novoStatus },
            destinos: { aplicarNoCadastroBase: false, menuIds: destinos.menuIds },
          })
        },
      }
    )
  }, [patchMutation, filterStatus, pedirConfirmacao, aplicarNosDestinos])

  const handleToggleBooleanField = useCallback(async (produtoId: string, field: ToggleField, novoValor: boolean) => {
    if (field !== 'favorito') {
      patchMutation.mutate({ type: 'toggle', produtoId, field, novoValor })
      return
    }
    const destinos = await pedirConfirmacao({ origem: 'cadastroBase', produtoId })
    if (destinos === null) return
    patchMutation.mutate(
      { type: 'toggle', produtoId, field, novoValor },
      {
        onSuccess: () => {
          if (destinos.menuIds.length === 0) return
          void aplicarNosDestinos({
            produtoId,
            snapshot: { favorito: novoValor },
            destinos: { aplicarNoCadastroBase: false, menuIds: destinos.menuIds },
          })
        },
      }
    )
  }, [patchMutation, pedirConfirmacao, aplicarNosDestinos])

  const handleEditProduto = useCallback((produtoId: string) => {
    const produto = produtos.find((p) => p.getId() === produtoId)
    if (!produto) return
    openTabsModal({ tab: 'produto', mode: 'edit', produto, grupoId: produto.getGrupoId() })
  }, [produtos, openTabsModal])

  const handleCopyProduto = useCallback((produtoId: string) => {
    const produto = produtos.find((p) => p.getId() === produtoId)
    if (!produto) return
    openTabsModal({ tab: 'produto', mode: 'copy', produto, grupoId: produto.getGrupoId() })
  }, [produtos, openTabsModal])

  const handleUploadImagemLista = useCallback(
    async (produtoId: string, file: File) => {
      setSavingImageProdutoId(produtoId)
      try {
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) throw new Error('Token não encontrado')

        const principalId = await buscarIdMenuPrincipal(token)
        const destinosIniciais = unirMenuIds(principalId)
        if (destinosIniciais.length === 0) {
          throw new Error('Não foi possível identificar o menu principal para salvar a imagem')
        }

        await aplicarImagemProdutoNosMenus({
          token,
          produtoId,
          menuIds: destinosIniciais,
          file,
          vincularSeAusente: true,
        })

        const todosMenus = await buscarMenusDaEmpresa({ token })
        const menusJaSalvos = todosMenus
          .filter(m => destinosIniciais.includes(m.id))
          .map(m => ({ id: m.id, nome: m.nome }))

        const destinos = await pedirConfirmacao({
          origem: 'cadastroBase',
          produtoId,
          variante: 'imagem',
          excluirMenuIds: destinosIniciais,
          fonteMenus: 'empresa',
          menusJaSalvos,
        })
        if (destinos && destinos.menuIds.length > 0) {
          await aplicarImagemNosDestinos({
            produtoId,
            file,
            destinos,
            vincularSeAusente: true,
          })
          showToast.success('Imagem atualizada no menu principal e nos selecionados')
        } else {
          showToast.success('Imagem atualizada no menu principal')
        }

        if (empresaId) {
          void queryClient.invalidateQueries({
            queryKey: ['tenant', empresaId, 'produtos-imagens-cadastro'],
            exact: false,
            refetchType: 'active',
          })
        }
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar imagem')
      } finally {
        setSavingImageProdutoId(null)
      }
    },
    [pedirConfirmacao, aplicarImagemNosDestinos, empresaId, queryClient]
  )

  const { selectForEntity: selectProdutoImagem, cropModal: produtoCropModal } =
    useEntityImageCropUpload({
      preset: MENU_PRODUTO_CROP_PRESET,
      upload: handleUploadImagemLista,
    })

  const handleChangeImage = useCallback(
    (produtoId: string, file: File) => {
      selectProdutoImagem(produtoId, file)
    },
    [selectProdutoImagem]
  )

  const isLoadingAny = isLoading || isFetching || isFetchingNextPage
  const showInitialLoading = isLoadingAny && produtosVisiveis.length === 0
  const showEmpty = !isLoadingAny && produtosVisiveis.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProdutosHeader
        totalLocal={produtosVisiveis.length}
        totalApi={totalProdutos}
        searchText={filters.searchText}
        onSearchChange={actions.setSearch}
        onNovoProduto={() => tipoCadastro.pedirTipo(() => openWizardCadastro())}
      />

      <div className="h-[4px] border-t-2 border-primary/50 flex-shrink-0" />

      <ProdutosFilters
        filtrosVisiveis={filtrosVisiveis}
        isMobile={isMobile}
        onToggleFiltros={() => setFiltrosVisiveis((v) => !v)}
        filterStatus={filters.filterStatus}
        onFilterStatusChange={actions.setStatus}
        statusGrupoFilter={filters.statusGrupoFilter}
        onStatusGrupoChange={actions.setStatusGrupo}
        grupoProdutoFilter={filters.grupoProdutoFilter}
        onGrupoProdutoChange={actions.setGrupoProduto}
        gruposProdutos={gruposProdutosFiltrados}
        isLoadingGruposProdutos={isLoadingGruposProdutos}
        grupoComplementoFilter={filters.grupoComplementoFilter}
        onGrupoComplementoChange={actions.setGrupoComplemento}
        gruposComplementos={gruposComplementos}
        isLoadingGruposComplementos={isLoadingGruposComplementos}
        onClearFilters={actions.reset}
      />

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-1 mt-2 scrollbar-hide"
      >
        {showInitialLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <JiffyLoading />
          </div>
        ) : showEmpty ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div role="list" aria-label="Lista de produtos" className="space-y-1 pb-4">
            {produtosVisiveis.map((produto) => (
              <div key={produto.getId()} role="listitem">
                <ProdutoListItem
                  produto={produto}
                  imagemUrl={imagensPorProdutoId[produto.getId()] ?? produto.getImagemUrl()}
                  isSavingValor={isSavingOf(patchMutation, produto.getId(), 'valor')}
                  isSavingStatus={isSavingOf(patchMutation, produto.getId(), 'status')}
                  isSavingImage={savingImageProdutoId === produto.getId()}
                  onValorChange={handleValorChange}
                  onSwitchToggle={handleStatusToggle}
                  onToggleBoolean={handleToggleBooleanField}
                  onEditProduto={handleEditProduto}
                  onCopyProduto={handleCopyProduto}
                  onChangeImage={handleChangeImage}
                />
              </div>
            ))}
          </div>
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <JiffyLoading />
          </div>
        )}
      </div>

      <EscolherTipoProdutoModal
        open={tipoCadastro.open}
        onClose={tipoCadastro.fechar}
        onContinuar={tipoCadastro.continuar}
      />
      <ProdutoNovoWizard
        origem="cadastro"
        open={wizardOpen}
        onClose={closeWizardCadastro}
        onSuccess={() => handleTabsModalReload()}
      />
      <ProdutosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onReload={handleTabsModalReload}
        onTabChange={(tab) => setTabsModalState((prev) => ({ ...prev, tab }))}
      />
      {dialogPropagacao}
      {produtoCropModal}
    </div>
  )
}
