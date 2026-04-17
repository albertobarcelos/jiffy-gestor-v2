'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

import { useProdutosInfinite } from '@/src/presentation/hooks/useProdutos'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { useProdutoPatchMutation, isSavingOf } from '@/src/presentation/hooks/useProdutoPatchMutation'
import { useGrupoProdutoPatchMutation } from '@/src/presentation/hooks/useGrupoProdutoPatchMutation'
import { useProdutosFilters } from '@/src/presentation/hooks/useProdutosFilters'
import { useIsMobile } from '@/src/presentation/hooks/useIsMobile'

import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { ProdutosTabsModal, type ProdutosTabsModalState } from '../ProdutosTabsModal'
import { ProdutosHeader } from './ProdutosHeader'
import { ProdutosFilters } from './ProdutosFilters'
import { ProdutosGroupHeader } from './ProdutosGroupHeader'
import { ProdutoListItem } from './ProdutoListItem'

import { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import { sortProdutosAlphabetically, normalizeGroupName } from './utils'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  const { state: filters, actions, queryParams, filterStatus } = useProdutosFilters()

  // Sempre inicia como `false` para coincidir com o SSR; corrigido após hidratação via useIsMobile.
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false)
  useEffect(() => { setFiltrosVisiveis(!isMobile) }, [isMobile])

  // Indexado por grupoId (ou '__sem_grupo__') para evitar colisões de nome normalizado.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const [tabsModalState, setTabsModalState] = useState<ProdutosTabsModalState>({
    open: false, tab: 'produto', mode: 'create',
    prefillGrupoProdutoId: undefined, grupoId: undefined,
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const patchMutation = useProdutoPatchMutation()
  const grupoPatchMutation = useGrupoProdutoPatchMutation()

  const { data: gruposProdutos = [], isLoading: isLoadingGruposProdutos } = useGruposProdutos({ limit: 100, ativo: null })
  const { data: gruposComplementos = [], isLoading: isLoadingGruposComplementos } = useGruposComplementos({ limit: 100, ativo: null })

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isLoading, error } =
    useProdutosInfinite(queryParams)

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

  const produtosSorted = useMemo(() => sortProdutosAlphabetically(produtos), [produtos])

  const produtosAgrupados = useMemo(() => {
    const map = new Map<string, Produto[]>()
    produtosSorted.forEach((p) => {
      const grupo = normalizeGroupName(p.getNomeGrupo())
      if (!map.has(grupo)) map.set(grupo, [])
      map.get(grupo)!.push(p)
    })
    return Array.from(map.entries())
  }, [produtosSorted])

  // Map consolidado: visual + ativo por grupoId. Evita lookup O(N) por render.
  const grupoProdutoMap = useMemo(() => {
    const map = new Map<string, { corHex: string; iconName: string; ativo: boolean }>()
    gruposProdutos.forEach((g) =>
      map.set(g.getId(), { corHex: g.getCorHex(), iconName: g.getIconName(), ativo: g.isAtivo() })
    )
    return map
  }, [gruposProdutos])

  // Inicializar grupos expandidos quando novos grupos aparecem
  useEffect(() => {
    setExpandedGroups((prev) => {
      let changed = false
      const next: Record<string, boolean> = {}
      produtosAgrupados.forEach(([, items]) => {
        const groupKey = items[0]?.getGrupoId() ?? '__sem_grupo__'
        if (typeof prev[groupKey] === 'undefined') { changed = true; next[groupKey] = true }
        else next[groupKey] = prev[groupKey]
      })
      return changed ? next : prev
    })
  }, [produtosAgrupados])

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
      setTabsModalState({ open: true, tab: 'produto', mode: 'create', ...config })
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      params.set('modalOpen', 'true')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, searchParams, pathname]
  )

  const closeTabsModal = useCallback(() => {
    setTabsModalState({ open: false, tab: 'produto', mode: 'create', prefillGrupoProdutoId: undefined, grupoId: undefined })
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.delete('modalOpen')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const updateProdutoInCache = useCallback((produtoId: string, produtoData: unknown) => {
    queryClient.setQueriesData<InfinitePagesData>(
      { queryKey: ['produtos', 'infinite'], exact: false },
      (oldData) => {
        if (!oldData?.pages) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            produtos: page.produtos.map((p) => {
              if (p.getId() !== produtoId) return p
              try { return Produto.fromJSON(produtoData) } catch { return p }
            }),
          })),
        }
      }
    )
  }, [queryClient])

  const handleTabsModalReload = useCallback((produtoId?: string, produtoData?: unknown) => {
    if (produtoId && produtoData) {
      updateProdutoInCache(produtoId, produtoData)
    } else {
      void queryClient.invalidateQueries({ queryKey: ['produtos', 'infinite'], exact: false, refetchType: 'active' })
      void queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false, refetchType: 'active' })
    }
  }, [queryClient, updateProdutoInCache])

  // Handlers de produto — recebem produtoId como arg, sem closure por item
  const handleValorChange = useCallback((produtoId: string, novoValor: number) => {
    patchMutation.mutate({ type: 'valor', produtoId, novoValor })
  }, [patchMutation])

  const handleStatusToggle = useCallback((produtoId: string, novoStatus: boolean) => {
    patchMutation.mutate({ type: 'status', produtoId, novoStatus, filterStatus })
  }, [patchMutation, filterStatus])

  const handleToggleBooleanField = useCallback((produtoId: string, field: ToggleField, novoValor: boolean) => {
    patchMutation.mutate({ type: 'toggle', produtoId, field, novoValor })
  }, [patchMutation])

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

  const handleOpenComplementosModal = useCallback((produto: Produto) => {
    openTabsModal({ tab: 'complementos', mode: 'edit', produto, grupoId: produto.getGrupoId() })
  }, [openTabsModal])

  const handleOpenImpressorasModal = useCallback((produto: Produto) => {
    openTabsModal({ tab: 'impressoras', mode: 'edit', produto, grupoId: produto.getGrupoId() })
  }, [openTabsModal])

  // Handlers de grupo — todos estáveis, recebem IDs como argumento
  const handleToggleExpand = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const currentlyExpanded = prev[groupKey] !== false
      return { ...prev, [groupKey]: !currentlyExpanded }
    })
  }, [])

  const handleToggleGroupStatus = useCallback((grupoId: string) => {
    const info = grupoProdutoMap.get(grupoId)
    if (!info) return
    grupoPatchMutation.mutate({ grupoId, novoStatus: !info.ativo })
  }, [grupoProdutoMap, grupoPatchMutation])

  const handleEditGrupoProduto = useCallback((grupoId: string | undefined) => {
    if (!grupoId) return
    const primeiroProduto = produtos.find((p) => p.getGrupoId() === grupoId)
    openTabsModal({ tab: 'grupo', mode: 'edit', grupoId, produto: primeiroProduto })
  }, [produtos, openTabsModal])

  const handleAddProdutoForGroup = useCallback((grupoNome: string, grupoId: string | undefined) => {
    if (!grupoId || grupoNome.toLowerCase() === 'sem grupo') {
      openTabsModal({ tab: 'produto', mode: 'create' })
      return
    }
    openTabsModal({ tab: 'produto', mode: 'create', prefillGrupoProdutoId: grupoId })
  }, [openTabsModal])

  const isLoadingAny = isLoading || isFetching || isFetchingNextPage

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProdutosHeader
        totalLocal={produtos.length}
        totalApi={totalProdutos}
        searchText={filters.searchText}
        onSearchChange={actions.setSearch}
        onNovoProduto={() => openTabsModal({ tab: 'produto', mode: 'create' })}
      />

      <div className="h-[4px] border-t-2 border-primary/50 flex-shrink-0" />

      <ProdutosFilters
        filtrosVisiveis={filtrosVisiveis}
        isMobile={isMobile}
        onToggleFiltros={() => setFiltrosVisiveis((v) => !v)}
        filterStatus={filters.filterStatus}
        onFilterStatusChange={actions.setStatus}
        ativoLocalFilter={filters.ativoLocalFilter}
        onAtivoLocalChange={actions.setAtivoLocal}
        ativoDeliveryFilter={filters.ativoDeliveryFilter}
        onAtivoDeliveryChange={actions.setAtivoDelivery}
        grupoProdutoFilter={filters.grupoProdutoFilter}
        onGrupoProdutoChange={actions.setGrupoProduto}
        gruposProdutos={gruposProdutos}
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
        {/* Loading inicial */}
        {isLoadingAny && produtos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <JiffyLoading />
          </div>
        )}

        {/* Sem resultados */}
        {!isLoadingAny && produtos.length === 0 && data && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado.</p>
          </div>
        )}

        {/* Lista agrupada */}
        {produtosAgrupados.length > 0 && (
          <div role="list" aria-label="Lista de produtos" className="space-y-4 pb-4">
            {produtosAgrupados.map(([grupo, items]) => {
              const grupoId = items[0]?.getGrupoId()
              const groupKey = grupoId ?? '__sem_grupo__'
              const info = grupoId ? grupoProdutoMap.get(grupoId) : undefined
              const grupoVisual = info ? { corHex: info.corHex, iconName: info.iconName } : undefined
              const grupoAtivo = info?.ativo ?? true
              const isExpanded = expandedGroups[groupKey] !== false

              return (
                <div key={groupKey} role="listitem" className="space-y-1">
                  {/* sticky top-0 z-20: CSS nativo, sem JS, sem complexidade */}
                  <div className="sticky top-0 z-20 -mx-1 bg-gray-50">
                    <ProdutosGroupHeader
                      grupo={grupo}
                      grupoId={grupoId}
                      groupKey={groupKey}
                      grupoVisual={grupoVisual}
                      grupoAtivo={grupoAtivo}
                      itemCount={items.length}
                      isExpanded={isExpanded}
                      onToggleExpand={handleToggleExpand}
                      onEditGrupo={handleEditGrupoProduto}
                      onToggleGrupoStatus={handleToggleGroupStatus}
                      onAddProduto={handleAddProdutoForGroup}
                    />
                  </div>

                  {!isExpanded ? (
                    <div className="rounded-xl border border-dashed border-secondary/40 px-4 py-1 text-sm text-secondary-text mx-1">
                      Produtos ocultos. Clique{' '}
                      <button
                        type="button"
                        onClick={() => handleToggleExpand(groupKey)}
                        className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
                      >
                        aqui!
                      </button>{' '}
                      para visualizar.
                    </div>
                  ) : (
                    <div>
                      {items.map((produto) => (
                        // content-visibility: auto faz o browser pular layout/paint de itens
                        // fora do viewport — virtualização CSS nativa, sem quebrar o sticky.
                        <div
                          key={produto.getId()}
                          style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 90px' }}
                        >
                          <ProdutoListItem
                            produto={produto}
                            isSavingValor={isSavingOf(patchMutation, produto.getId(), 'valor')}
                            isSavingStatus={isSavingOf(patchMutation, produto.getId(), 'status')}
                            onValorChange={handleValorChange}
                            onSwitchToggle={handleStatusToggle}
                            onToggleBoolean={handleToggleBooleanField}
                            onOpenComplementosModal={handleOpenComplementosModal}
                            onOpenImpressorasModal={handleOpenImpressorasModal}
                            onEditProduto={handleEditProduto}
                            onCopyProduto={handleCopyProduto}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <JiffyLoading />
          </div>
        )}
      </div>

      <ProdutosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onReload={handleTabsModalReload}
        onTabChange={(tab) => setTabsModalState((prev) => ({ ...prev, tab }))}
      />
    </div>
  )
}
