'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

import { useProdutosInfinite } from '@/src/presentation/hooks/useProdutos'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { useProdutoPatchMutation } from '@/src/presentation/hooks/useProdutoPatchMutation'
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

interface ProdutosListProps {
  onReload?: () => void
}

export function ProdutosList({ onReload }: ProdutosListProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  const { state: filters, actions, queryParams, filterStatus } = useProdutosFilters()
  // Sempre inicia como `false` para coincidir com o SSR.
  // O useEffect abaixo corrige para o valor real após hidratação.
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false)

  useEffect(() => {
    setFiltrosVisiveis(window.innerWidth >= 768)
  }, [])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [tabsModalState, setTabsModalState] = useState<ProdutosTabsModalState>({
    open: false, tab: 'produto', mode: 'create',
    prefillGrupoProdutoId: undefined, grupoId: undefined,
  })

  const sentinelRef = useRef<HTMLDivElement>(null)
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

  const grupoProdutoMap = useMemo(() => {
    const map = new Map<string, { corHex: string; iconName: string }>()
    gruposProdutos.forEach((g) => map.set(g.getId(), { corHex: g.getCorHex(), iconName: g.getIconName() }))
    return map
  }, [gruposProdutos])

  // Inicializar grupos expandidos quando novos grupos aparecem
  useEffect(() => {
    setExpandedGroups((prev) => {
      let changed = false
      const next: Record<string, boolean> = {}
      produtosAgrupados.forEach(([grupo]) => {
        if (typeof prev[grupo] === 'undefined') { changed = true; next[grupo] = true }
        else next[grupo] = prev[grupo]
      })
      return changed ? next : prev
    })
  }, [produtosAgrupados])

  // Scroll infinito via IntersectionObserver no sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !isFetching) {
          fetchNextPage()
        }
      },
      { root: scrollContainerRef.current, rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage])

  useEffect(() => {
    if (error) console.error('Erro ao carregar produtos:', error)
  }, [error])

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

  const updateProdutoInCache = useCallback((produtoId: string, produtoData: any) => {
    queryClient.setQueriesData(
      { queryKey: ['produtos', 'infinite'], exact: false },
      (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            produtos: page.produtos.map((p: Produto) => {
              if (p.getId() !== produtoId) return p
              try { return Produto.fromJSON(produtoData) } catch { return p }
            }),
          })),
        }
      }
    )
  }, [queryClient])

  const handleTabsModalReload = useCallback((produtoId?: string, produtoData?: any) => {
    if (produtoId && produtoData) {
      updateProdutoInCache(produtoId, produtoData)
    } else {
      void queryClient.invalidateQueries({ queryKey: ['produtos', 'infinite'], exact: false, refetchType: 'active' })
      void queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false, refetchType: 'active' })
    }
  }, [queryClient, updateProdutoInCache])

  // Handlers estáveis — passam o id como arg, sem closure por item
  const handleValorChange = useCallback((produtoId: string, novoValor: number) => {
    patchMutation.mutate({ type: 'valor', produtoId, novoValor })
  }, [patchMutation])

  const handleStatusToggle = useCallback((produtoId: string, novoStatus: boolean) => {
    patchMutation.mutate({ type: 'status', produtoId, novoStatus, filterStatus })
  }, [patchMutation, filterStatus])

  const handleToggleBooleanField = useCallback((produtoId: string, field: ToggleField, novoValor: boolean) => {
    patchMutation.mutate({ type: 'toggle', produtoId, field, novoValor })
  }, [patchMutation])

  const handleToggleGroupStatus = useCallback((grupoId: string) => {
    const grupo = gruposProdutos.find((g) => g.getId() === grupoId)
    if (!grupo) return
    grupoPatchMutation.mutate({ grupoId, novoStatus: !grupo.isAtivo() })
  }, [gruposProdutos, grupoPatchMutation])

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

  const handleEditGrupoProduto = useCallback((grupoId?: string, produto?: Produto) => {
    if (!grupoId) return
    openTabsModal({ tab: 'grupo', mode: 'edit', grupoId, produto })
  }, [openTabsModal])

  const handleCreateProdutoForGroup = useCallback((grupoNome: string) => {
    if (!grupoNome || grupoNome.toLowerCase() === 'sem grupo') {
      openTabsModal({ tab: 'produto', mode: 'create' })
      return
    }
    const normalized = grupoNome.trim().toLowerCase()
    const matched = gruposProdutos.find((g) => g.getNome().trim().toLowerCase() === normalized)
    openTabsModal({ tab: 'produto', mode: 'create', prefillGrupoProdutoId: matched?.getId() })
  }, [gruposProdutos, openTabsModal])

  const isLoadingAny = isLoading || isFetching || isFetchingNextPage

  return (
    <div className="flex flex-col h-full">
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
        className="flex-1 overflow-y-auto px-1 mt-2 space-y-6 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 230px)' }}
      >
        {isLoadingAny && produtos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <JiffyLoading />
          </div>
        )}

        {!isLoadingAny && produtos.length === 0 && data && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado.</p>
          </div>
        )}

        {produtosAgrupados.map(([grupo, items]) => {
          const primeiroProduto = items[0]
          const grupoId = primeiroProduto?.getGrupoId()
          const grupoVisual = grupoId ? grupoProdutoMap.get(grupoId) : undefined
          const grupoAtivo = grupoVisual
            ? gruposProdutos.find((g) => g.getId() === grupoId)?.isAtivo() ?? true
            : true
          const isExpanded = expandedGroups[grupo] !== false

          return (
            <div key={grupo} className="space-y-1">
              <ProdutosGroupHeader
                grupo={grupo}
                grupoId={grupoId}
                grupoVisual={grupoVisual}
                grupoAtivo={grupoAtivo}
                itemCount={items.length}
                isExpanded={isExpanded}
                primeiroProduto={primeiroProduto}
                onToggleExpand={() => setExpandedGroups((prev) => ({ ...prev, [grupo]: !prev[grupo] }))}
                onEditGrupo={() => handleEditGrupoProduto(grupoId, primeiroProduto)}
                onToggleGrupoStatus={() => grupoId && handleToggleGroupStatus(grupoId)}
                onAddProduto={() => handleCreateProdutoForGroup(grupo)}
              />

              {!isExpanded ? (
                <div className="rounded-xl border border-dashed border-secondary/40 px-4 py-1 text-sm text-secondary-text">
                  Produtos ocultos. Clique{' '}
                  <button
                    type="button"
                    onClick={() => setExpandedGroups((prev) => ({ ...prev, [grupo]: true }))}
                    className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
                  >
                    aqui!
                  </button>{' '}
                  para visualizar.
                </div>
              ) : (
                <div>
                  {items.map((produto) => (
                    <ProdutoListItem
                      key={produto.getId()}
                      produto={produto}
                      isSavingValor={
                        patchMutation.isPending &&
                        (patchMutation.variables as any)?.produtoId === produto.getId() &&
                        (patchMutation.variables as any)?.type === 'valor'
                      }
                      isSavingStatus={
                        patchMutation.isPending &&
                        (patchMutation.variables as any)?.produtoId === produto.getId() &&
                        (patchMutation.variables as any)?.type === 'status'
                      }
                      savingToggleState={undefined}
                      onValorChange={(valor) => handleValorChange(produto.getId(), valor)}
                      onSwitchToggle={(status) => handleStatusToggle(produto.getId(), status)}
                      onToggleBoolean={(field, value) => handleToggleBooleanField(produto.getId(), field, value)}
                      onOpenComplementosModal={() => handleOpenComplementosModal(produto)}
                      onOpenImpressorasModal={() => handleOpenImpressorasModal(produto)}
                      onEditProduto={() => handleEditProduto(produto.getId())}
                      onCopyProduto={() => handleCopyProduto(produto.getId())}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Sentinel para scroll infinito */}
        <div ref={sentinelRef} className="h-4" />

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
