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
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { PizzaNovoWizard } from '@/src/presentation/components/features/pizza/PizzaNovoWizard'

import { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import {
  sortProdutosPorOrdemMenu,
  mapaOrdemGrupoProduto,
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
  const { toGestao } = useGestaoPath()
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
  const invalidate = useInvalidateTenantQueries()
  const [pizzaWizardOpen, setPizzaWizardOpen] = useState(false)
  const abrirWizardPizza = useCallback(() => setPizzaWizardOpen(true), [])
  const handlePizzaCadastroConcluido = useCallback(async () => {
    setPizzaWizardOpen(false)
    await invalidate(['pizza'])
    router.push(toGestao('/produtos/pizzas'))
  }, [invalidate, router, toGestao])
  const tipoCadastro = useEscolherTipoProdutoCadastro({ onPizza: abrirWizardPizza })
  const [wizardOpen, setWizardOpen] = useState(false)
  const { pedirConfirmacao, aplicarNosDestinos, dialog: dialogPropagacao } =
    usePropagarAlteracaoProduto()

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

  const grupoProdutoMap = useMemo(() => {
    const map = new Map<string, { ativo: boolean }>()
    gruposProdutos.forEach(g => map.set(g.getId(), { ativo: g.isAtivo() }))
    return map
  }, [gruposProdutos])

  const ordemGrupoPorId = useMemo(
    () => mapaOrdemGrupoProduto(gruposProdutos),
    [gruposProdutos]
  )

  const filtraStatusCategoria = filters.statusGrupoFilter !== 'Todos'

  const produtosVisiveis = useMemo(() => {
    let list = produtos

    if (filters.grupoProdutoFilter.length > 1) {
      const idsSelecionados = new Set(filters.grupoProdutoFilter)
      list = list.filter(p => {
        const grupoId = p.getGrupoId()
        return Boolean(grupoId && idsSelecionados.has(grupoId))
      })
    }

    if (filtraStatusCategoria) {
      list = list.filter(p => {
        const grupoId = p.getGrupoId()
        if (!grupoId) {
          return filters.statusGrupoFilter === 'Ativo'
        }
        const ativo = grupoProdutoMap.get(grupoId)?.ativo
        if (typeof ativo !== 'boolean') return filters.statusGrupoFilter === 'Ativo'
        return filters.statusGrupoFilter === 'Ativo' ? ativo : !ativo
      })
    }

    return sortProdutosPorOrdemMenu(list, ordemGrupoPorId)
  }, [
    produtos,
    grupoProdutoMap,
    ordemGrupoPorId,
    filtraStatusCategoria,
    filters.statusGrupoFilter,
    filters.grupoProdutoFilter,
  ])

  /** Status categoria filtra no cliente — carrega todas as páginas da API antes de contar/exibir. */
  useEffect(() => {
    if (!filtraStatusCategoria) return
    if (hasNextPage && !isFetchingNextPage && !isFetching) {
      void fetchNextPage()
    }
  }, [
    filtraStatusCategoria,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
    produtos.length,
  ])

  const totalContagem = filtraStatusCategoria ? produtosVisiveis.length : totalProdutos

  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Scroll infinito: só busca a próxima página quando o sentinela entra na viewport da lista
  useEffect(() => {
    const sentinel = loadMoreRef.current
    const root = scrollContainerRef.current
    if (!sentinel || !root || !hasNextPage || isFetchingNextPage || isFetching) {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting) && hasNextPage && !isFetchingNextPage && !isFetching) {
          void fetchNextPage()
        }
      },
      { root, rootMargin: '120px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
    produtosVisiveis.length,
  ])

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
  const handleNomeChange = useCallback(async (produtoId: string, novoNome: string) => {
    const destinos = await pedirConfirmacao({ origem: 'cadastroBase', produtoId })
    if (destinos === null) return false
    patchMutation.mutate(
      { type: 'nome', produtoId, novoNome },
      {
        onSuccess: () => {
          if (destinos.menuIds.length === 0) return
          void aplicarNosDestinos({
            produtoId,
            snapshot: { nome: novoNome },
            destinos: { aplicarNoCadastroBase: false, menuIds: destinos.menuIds },
          })
        },
      }
    )
    return true
  }, [patchMutation, pedirConfirmacao, aplicarNosDestinos])

  const handleValorChange = useCallback(async (produtoId: string, novoValor: number) => {
    const destinos = await pedirConfirmacao({ origem: 'cadastroBase', produtoId })
    if (destinos === null) return false
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
    return true
  }, [patchMutation, pedirConfirmacao, aplicarNosDestinos])

  const handleGrupoChange = useCallback(
    async (produtoId: string, novoGrupoId: string, novoGrupoNome: string) => {
      const produto = produtos.find(p => p.getId() === produtoId)
      if (!produto || produto.getGrupoId() === novoGrupoId) return false

      const destinos = await pedirConfirmacao({ origem: 'cadastroBase', produtoId })
      if (destinos === null) return false

      patchMutation.mutate(
        { type: 'grupo', produtoId, novoGrupoId, novoGrupoNome },
        {
          onSuccess: () => {
            if (destinos.menuIds.length === 0) return
            void aplicarNosDestinos({
              produtoId,
              snapshot: { grupoProdutoId: novoGrupoId },
              destinos: { aplicarNoCadastroBase: false, menuIds: destinos.menuIds },
            })
          },
        }
      )
      return true
    },
    [produtos, patchMutation, pedirConfirmacao, aplicarNosDestinos]
  )

  const handleStatusToggle = useCallback(async (produtoId: string, novoStatus: boolean) => {
    const destinos = await pedirConfirmacao({
      origem: 'cadastroBase',
      produtoId,
      variante: 'statusAtivo',
      novoAtivo: novoStatus,
    })
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

  const isLoadingAny = isLoading || isFetching || isFetchingNextPage
  const showInitialLoading = isLoadingAny && produtosVisiveis.length === 0
  const showEmpty = !isLoadingAny && produtosVisiveis.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProdutosHeader
        totalLocal={produtosVisiveis.length}
        totalApi={totalContagem}
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
                  gruposProdutos={gruposProdutos}
                  isLoadingGruposProdutos={isLoadingGruposProdutos}
                  isSavingValor={isSavingOf(patchMutation, produto.getId(), 'valor')}
                  isSavingStatus={isSavingOf(patchMutation, produto.getId(), 'status')}
                  isSavingNome={isSavingOf(patchMutation, produto.getId(), 'nome')}
                  isSavingGrupo={isSavingOf(patchMutation, produto.getId(), 'grupo')}
                  onNomeChange={handleNomeChange}
                  onValorChange={handleValorChange}
                  onGrupoChange={handleGrupoChange}
                  onSwitchToggle={handleStatusToggle}
                  onToggleBoolean={handleToggleBooleanField}
                  onEditProduto={handleEditProduto}
                  onCopyProduto={handleCopyProduto}
                />
              </div>
            ))}
            {hasNextPage ? <div ref={loadMoreRef} className="h-4 w-full" aria-hidden /> : null}
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
      <PizzaNovoWizard
        open={pizzaWizardOpen}
        onClose={() => setPizzaWizardOpen(false)}
        onSuccess={() => void handlePizzaCadastroConcluido()}
      />
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
