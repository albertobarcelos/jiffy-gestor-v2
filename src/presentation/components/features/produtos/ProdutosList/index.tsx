'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

import { useProdutosInfinite } from '@/src/presentation/hooks/useProdutos'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { useProdutoPatchMutation, isSavingOf } from '@/src/presentation/hooks/useProdutoPatchMutation'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import { useGrupoProdutoPatchMutation } from '@/src/presentation/hooks/useGrupoProdutoPatchMutation'
import { useProdutosFilters } from '@/src/presentation/hooks/useProdutosFilters'
import { useIsMobile } from '@/src/presentation/hooks/useIsMobile'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { ProdutosTabsModal, type ProdutosTabsModalState } from '../ProdutosTabsModal'
import { ProdutosHeader } from './ProdutosHeader'
import { ProdutosFilters } from './ProdutosFilters'
import { ProdutoListItem } from './ProdutoListItem'
import { CatalogGroupedList } from '@/src/presentation/components/features/catalogo/CatalogGroupedList'
import type { CatalogGroup } from '@/src/presentation/components/features/catalogo/types'

import { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import {
  sortProdutosAlphabetically,
  sortProdutosWithinGroup,
  normalizeGroupName,
  buildProdutoGroupKey,
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

  // Indexado por grupoId (ou '__sem_grupo__') para evitar colisões de nome normalizado.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const [tabsModalState, setTabsModalState] = useState<ProdutosTabsModalState>({
    open: false, tab: 'produto', mode: 'create',
    prefillGrupoProdutoId: undefined, grupoId: undefined,
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const patchMutation = useProdutoPatchMutation()
  const { pedirConfirmacao, aplicarNosDestinos, dialog: dialogPropagacao } =
    usePropagarAlteracaoProduto()
  const grupoPatchMutation = useGrupoProdutoPatchMutation()

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
      const key = buildProdutoGroupKey(p)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })
    return Array.from(map.entries()).map(([groupKey, items]) => ({
      groupKey,
      grupoLabel: normalizeGroupName(items[0]?.getNomeGrupo()),
      items: sortProdutosWithinGroup(items),
    }))
  }, [produtosSorted])

  // Map consolidado: visual + ativo por grupoId. Evita lookup O(N) por render.
  const grupoProdutoMap = useMemo(() => {
    const map = new Map<string, { corHex: string; iconName: string; ativo: boolean; ordem: number }>()
    gruposProdutos.forEach((g) =>
      map.set(g.getId(), {
        corHex: g.getCorHex(),
        iconName: g.getIconName(),
        ativo: g.isAtivo(),
        ordem: g.getOrdem() ?? Number.MAX_SAFE_INTEGER,
      })
    )
    return map
  }, [gruposProdutos])

  /** Grupos ordenados por `ordem` (API), fallback por nome do grupo. */
  const produtosAgrupadosOrdenados = useMemo(() => {
    const ordenados = [...produtosAgrupados].sort((a, b) => {
      const grupoIdA = a.items[0]?.getGrupoId()
      const grupoIdB = b.items[0]?.getGrupoId()

      // "Sem grupo" sempre por último
      const semGrupoA = !grupoIdA
      const semGrupoB = !grupoIdB
      if (semGrupoA && !semGrupoB) return 1
      if (!semGrupoA && semGrupoB) return -1

      const ordemA = grupoIdA ? (grupoProdutoMap.get(grupoIdA)?.ordem ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
      const ordemB = grupoIdB ? (grupoProdutoMap.get(grupoIdB)?.ordem ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
      if (ordemA !== ordemB) return ordemA - ordemB

      const labelCmp = a.grupoLabel.localeCompare(b.grupoLabel, 'pt-BR', { sensitivity: 'base' })
      if (labelCmp !== 0) return labelCmp
      return a.groupKey.localeCompare(b.groupKey)
    })

    if (filters.statusGrupoFilter === 'Todos') return ordenados

    return ordenados.filter(({ items }) => {
      const grupoId = items[0]?.getGrupoId()
      if (!grupoId) {
        // "Sem grupo" só aparece quando o filtro de status do grupo é Ativo/Todos
        return filters.statusGrupoFilter === 'Ativo'
      }
      const ativo = grupoProdutoMap.get(grupoId)?.ativo
      if (typeof ativo !== 'boolean') return filters.statusGrupoFilter === 'Ativo'
      return filters.statusGrupoFilter === 'Ativo' ? ativo : !ativo
    })
  }, [produtosAgrupados, grupoProdutoMap, filters.statusGrupoFilter])

  // Inicializar grupos expandidos quando novos grupos aparecem
  useEffect(() => {
    setExpandedGroups((prev) => {
      let changed = false
      const next: Record<string, boolean> = {}
      produtosAgrupadosOrdenados.forEach(({ groupKey }) => {
        if (typeof prev[groupKey] === 'undefined') {
          changed = true
          next[groupKey] = true
        } else next[groupKey] = prev[groupKey]
      })
      return changed ? next : prev
    })
  }, [produtosAgrupadosOrdenados])

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
      const grupoId = config.grupoId
      const initialGrupo =
        config.initialGrupo ??
        (grupoId ? gruposProdutos.find(g => g.getId() === grupoId) : undefined)
      setTabsModalState({
        open: true,
        tab: 'produto',
        mode: 'create',
        ...config,
        initialGrupo,
      })
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      params.set('modalOpen', 'true')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, searchParams, pathname, gruposProdutos]
  )

  const closeTabsModal = useCallback(() => {
    setTabsModalState({
      open: false,
      tab: 'produto',
      mode: 'create',
      prefillGrupoProdutoId: undefined,
      grupoId: undefined,
      initialGrupo: undefined,
    })
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.delete('modalOpen')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

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
    if (!grupoId || grupoNome.toLowerCase() === 'sem categoria') {
      openTabsModal({ tab: 'produto', mode: 'create' })
      return
    }
    openTabsModal({ tab: 'produto', mode: 'create', prefillGrupoProdutoId: grupoId })
  }, [openTabsModal])

  const catalogGroups = useMemo<CatalogGroup<Produto>[]>(
    () =>
      produtosAgrupadosOrdenados.map(({ groupKey, grupoLabel, items }) => {
        const grupoId = items[0]?.getGrupoId()
        const info = grupoId ? grupoProdutoMap.get(grupoId) : undefined
        return {
          groupKey,
          grupoLabel,
          grupoId,
          grupoVisual: info ? { corHex: info.corHex, iconName: info.iconName } : undefined,
          grupoAtivo: info?.ativo ?? true,
          items,
        }
      }),
    [produtosAgrupadosOrdenados, grupoProdutoMap]
  )

  const renderCatalogItem = useCallback(
    (produto: Produto) => (
      <ProdutoListItem
        produto={produto}
        isSavingValor={isSavingOf(patchMutation, produto.getId(), 'valor')}
        isSavingStatus={isSavingOf(patchMutation, produto.getId(), 'status')}
        onValorChange={handleValorChange}
        onSwitchToggle={handleStatusToggle}
        onToggleBoolean={handleToggleBooleanField}
        onEditProduto={handleEditProduto}
        onCopyProduto={handleCopyProduto}
      />
    ),
    [
      patchMutation,
      handleValorChange,
      handleStatusToggle,
      handleToggleBooleanField,
      handleEditProduto,
      handleCopyProduto,
    ]
  )

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
        statusGrupoFilter={filters.statusGrupoFilter}
        onStatusGrupoChange={actions.setStatusGrupo}
        ativoLocalFilter={filters.ativoLocalFilter}
        onAtivoLocalChange={actions.setAtivoLocal}
        ativoDeliveryFilter={filters.ativoDeliveryFilter}
        onAtivoDeliveryChange={actions.setAtivoDelivery}
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
        <CatalogGroupedList
          groups={catalogGroups}
          getItemKey={produto => produto.getId()}
          renderItem={renderCatalogItem}
          expandedGroups={expandedGroups}
          isLoading={isLoadingAny && produtos.length === 0}
          emptyLabel="Nenhum produto encontrado."
          listAriaLabel="Lista de produtos"
          showGrupoStatusSwitch
          onToggleExpand={handleToggleExpand}
          onEditGrupo={handleEditGrupoProduto}
          onToggleGrupoStatus={handleToggleGroupStatus}
          onAddProduto={handleAddProdutoForGroup}
        />

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
      {dialogPropagacao}
    </div>
  )
}
