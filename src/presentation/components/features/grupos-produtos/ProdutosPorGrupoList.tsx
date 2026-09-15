'use client'

import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  ProdutosTabsModal,
  type ProdutosTabsModalState,
  type ProdutosTabsTabKey,
} from '../produtos/ProdutosTabsModal'
import {
  EscolherTipoProdutoModal,
  useEscolherTipoProdutoCadastro,
} from '../produtos/EscolherTipoProdutoModal'
import { ProdutoNovoWizard } from '../produtos/ProdutoNovoWizard'
import { Produto } from '@/src/domain/entities/Produto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md'

interface ProdutoGrupo {
  id: string
  nome: string
  valor: number
  ativo?: boolean
  ordem?: number
}

interface ProdutosResponse {
  items: ProdutoGrupo[]
  count: number
  hasMore: boolean
  nextOffset: number | null
}

interface ProdutosPorGrupoListProps {
  grupoProdutoId: string
}

const PAGE_SIZE = 10

export function ProdutosPorGrupoList({ grupoProdutoId }: ProdutosPorGrupoListProps) {
  const tipoCadastro = useEscolherTipoProdutoCadastro()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [localProdutos, setLocalProdutos] = useState<ProdutoGrupo[]>([])
  const [tabsModalState, setTabsModalState] = useState<ProdutosTabsModalState>({
    open: false,
    tab: 'produto',
    mode: 'create',
    produto: undefined,
    prefillGrupoProdutoId: undefined,
    grupoId: undefined,
  })
  const listRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const previousLocalProdutosRef = useRef<ProdutoGrupo[]>([])
  const isInitialLoadRef = useRef(true)
  const previousGrupoIdRef = useRef<string | undefined>(undefined)

  // Sensores para drag and drop
  // TouchSensor para mobile - delay curto para melhor UX, tolerance para evitar conflito com scroll
  // PointerSensor para desktop com constraint de distância para evitar drag acidental
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Delay de 100ms em touch para evitar conflito com scroll
        tolerance: 8, // Tolerância de 8px - permite pequeno movimento antes de ativar
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requer movimento de 8px para ativar (evita drag acidental em desktop)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useSecureTenantInfiniteQuery<ProdutosResponse, number>(
    ['produtos-por-grupo', grupoProdutoId],
    async (_ctx, pageParam) => {
      const res = await fetchGestorApi(
        `/api/grupos-produtos/${grupoProdutoId}/produtos?limit=${PAGE_SIZE}&offset=${pageParam}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Erro ao carregar produtos da categoria')
      }

      return res.json()
    },
    {
      initialPageParam: 0,
      enabled: !!grupoProdutoId,
      getNextPageParam: lastPage =>
        lastPage.hasMore && typeof lastPage.nextOffset === 'number'
          ? lastPage.nextOffset
          : undefined,
    }
  )

  const serverProdutos = useMemo(() => {
    return data?.pages.flatMap((page) => page.items || []) ?? []
  }, [data])

  useEffect(() => {
    // Resetar quando o grupo mudar
    if (previousGrupoIdRef.current !== grupoProdutoId) {
      isInitialLoadRef.current = true
      previousLocalProdutosRef.current = []
      previousGrupoIdRef.current = grupoProdutoId
    }

    // Na primeira carga, usar diretamente os produtos do servidor
    if (isInitialLoadRef.current) {
      setLocalProdutos(serverProdutos)
      previousLocalProdutosRef.current = serverProdutos
      isInitialLoadRef.current = false
      return
    }

    // Preservar a ordem atual dos produtos ao fazer merge com dados do servidor
    // Isso evita que produtos editados mudem de posição
    if (previousLocalProdutosRef.current.length > 0 && serverProdutos.length > 0) {
      // Criar um mapa de produtos do servidor por ID para acesso rápido
      const serverProdutosMap = new Map(serverProdutos.map((p) => [p.id, p]))

      // Manter produtos existentes na mesma ordem, atualizando seus dados
      const preservedOrder: ProdutoGrupo[] = []
      const processedIds = new Set<string>()

      // Primeiro, manter produtos que já existem na lista local na mesma ordem
      previousLocalProdutosRef.current.forEach((localProduto) => {
        const serverProduto = serverProdutosMap.get(localProduto.id)
        if (serverProduto) {
          // Atualizar dados mas manter a posição
          preservedOrder.push(serverProduto)
          processedIds.add(localProduto.id)
        }
      })

      // Depois, adicionar novos produtos que não estavam na lista local
      serverProdutos.forEach((serverProduto) => {
        if (!processedIds.has(serverProduto.id)) {
          preservedOrder.push(serverProduto)
        }
      })

      setLocalProdutos(preservedOrder)
      previousLocalProdutosRef.current = preservedOrder
    } else {
      // Se não há produtos locais ou no servidor, usar diretamente os do servidor
      setLocalProdutos(serverProdutos)
      previousLocalProdutosRef.current = serverProdutos
    }
  }, [serverProdutos, grupoProdutoId])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || !hasNextPage || isFetchingNextPage || isFetching) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetching) {
            fetchNextPage()
          }
        })
      },
      {
        root: listRef.current,
        rootMargin: '50px',
        threshold: 0.1,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, localProdutos.length])

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0)
  }, [])

  const handleOpenNovoProdutoModal = useCallback(() => {
    tipoCadastro.pedirTipo(() => setWizardOpen(true))
  }, [tipoCadastro.pedirTipo])

  const handleCloseWizard = useCallback(() => {
    setWizardOpen(false)
    void refetch()
  }, [refetch])
  const handleCloseTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      produto: undefined,
      prefillGrupoProdutoId: undefined,
      grupoId: undefined,
    }))
    refetch()
  }, [refetch])

  const handleTabsModalTabChange = useCallback((tab: ProdutosTabsTabKey) => {
    setTabsModalState(prev => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleEditProduto = useCallback(
    async (produtoId: string) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      try {
        const response = await fetchGestorApi(`/api/produtos/${produtoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao carregar produto')
        }

        const produtoData = await response.json()
        const produto = Produto.fromJSON(produtoData)

        setTabsModalState({
          open: true,
          tab: 'produto',
          mode: 'edit',
          produto,
          prefillGrupoProdutoId: undefined,
          grupoId: produto.getGrupoId(),
        })
      } catch (err) {
        console.error('Erro ao carregar produto:', err)
        showToast.error(err instanceof Error ? err.message : 'Erro ao carregar produto')
      }
    },
    []
  )

  const persistNovaOrdem = useCallback(
    async (updatedState: ProdutoGrupo[], movedId: string, newIndex: number, previousState: ProdutoGrupo[]) => {
      setLocalProdutos(updatedState)
      previousLocalProdutosRef.current = updatedState

      try {
        const response = await fetchGestorApi(`/api/produtos/${movedId}/reordena-produto`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ novaPosicao: newIndex + 1 }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.message || 'Erro ao reordenar produto')
        }

        showToast.success('Ordem do produto atualizada com sucesso!')
        refetch()
      } catch (err: unknown) {
        console.error('Erro ao reordenar produto:', err)
        setLocalProdutos(previousState)
        previousLocalProdutosRef.current = previousState
        showToast.error(err instanceof Error ? err.message : 'Erro ao reordenar produto')
      }
    },
    [refetch]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (!over || active.id === over.id) {
        return
      }

      const oldIndex = localProdutos.findIndex((produto) => produto.id === active.id)
      const newIndex = localProdutos.findIndex((produto) => produto.id === over.id)

      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      const previousState = [...localProdutos]
      const updatedState = arrayMove([...localProdutos], oldIndex, newIndex)
      await persistNovaOrdem(updatedState, String(active.id), newIndex, previousState)
    },
    [localProdutos, persistNovaOrdem]
  )

  const handleMoveProduto = useCallback(
    async (produtoId: string, direction: 'up' | 'down') => {
      const oldIndex = localProdutos.findIndex((produto) => produto.id === produtoId)
      if (oldIndex === -1) return

      const newIndex = direction === 'up' ? oldIndex - 1 : oldIndex + 1
      if (newIndex < 0 || newIndex >= localProdutos.length) return

      const previousState = [...localProdutos]
      const updatedState = arrayMove([...localProdutos], oldIndex, newIndex)
      await persistNovaOrdem(updatedState, produtoId, newIndex, previousState)
    },
    [localProdutos, persistNovaOrdem]
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-2 gap-4">
        <p className="text-secondary-text text-sm text-center">
          Não foi possível carregar os produtos desta categoria.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!isLoading && localProdutos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-text text-sm ">
          Nenhum produto associado a esta categoria.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col mx-1 bg-white overflow-hidden">
        <div className="mb-2 flex flex-wrap items-center gap-3 md:gap-5">
          <h2 className="shrink-0 text-primary text-sm font-semibold md:text-xl">
            Produtos
            <span className="ml-1.5 tabular-nums text-primary/70">
              ({data?.pages[0]?.count ?? localProdutos.length})
            </span>
          </h2>
          <div className="h-px min-w-[2rem] flex-1 bg-primary/70" aria-hidden />
          <button
            type="button"
            onClick={handleOpenNovoProdutoModal}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-info transition-colors hover:bg-primary/90 md:h-8 md:px-[10px] md:text-sm"
          >
            Novo produto
          </button>
        </div>

        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-3 rounded-lg bg-custom-2 px-2 py-2 text-xs font-semibold text-secondary-text md:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] md:text-sm">
          <span>Produto</span>
          <span className="text-right">Valor</span>
          <span className="text-center">Ordem</span>
        </div>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto px-1 py-2 space-y-1 [&::-webkit-scrollbar]:hidden md:px-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {isLoading && localProdutos.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <JiffyLoading />
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localProdutos.map((produto) => produto.id)}
              strategy={verticalListSortingStrategy}
            >
              {localProdutos.map((produto, index) => (
                <ProdutoItem
                  key={produto.id}
                  produto={produto}
                  index={index}
                  total={localProdutos.length}
                  formatCurrency={formatCurrency}
                  onEdit={handleEditProduto}
                  onMove={handleMoveProduto}
                />
              ))}
            </SortableContext>
          </DndContext>

          {hasNextPage && (
            <div ref={loadMoreRef} className="py-4">
              {isFetchingNextPage && (
                <div className="flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <EscolherTipoProdutoModal
        open={tipoCadastro.open}
        onClose={tipoCadastro.fechar}
        onContinuar={tipoCadastro.continuar}
      />
      <ProdutoNovoWizard
        origem="cadastro"
        open={wizardOpen}
        initialCategoriaId={grupoProdutoId}
        onClose={handleCloseWizard}
        onSuccess={() => void refetch()}
      />
      <ProdutosTabsModal
        state={tabsModalState}
        onClose={handleCloseTabsModal}
        onReload={(produtoId?: string, produtoData?: any) => {
          if (produtoId && produtoData) {
            setLocalProdutos((prev) =>
              prev.map((p) => (p.id === produtoId ? { ...p, ...produtoData } : p))
            )
          }
          refetch()
        }}
        onTabChange={handleTabsModalTabChange}
      />
    </>
  )
}

function ProdutoItem({
  produto,
  index,
  total,
  formatCurrency,
  onEdit,
  onMove,
}: {
  produto: ProdutoGrupo
  index: number
  total: number
  formatCurrency: (value: number) => string
  onEdit: (produtoId: string) => void
  onMove: (produtoId: string, direction: 'up' | 'down') => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const canMoveUp = index > 0
  const canMoveDown = index < total - 1

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-3 rounded-lg px-2 py-2 transition md:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] ${
        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
      } ${isDragging ? 'opacity-50 ring-2 ring-primary/40' : ''}`}
    >
      <button
        type="button"
        onClick={() => onEdit(produto.id)}
        className="min-w-0 truncate text-left text-xs font-medium uppercase text-primary-text hover:text-primary hover:underline md:text-sm"
        title="Editar produto"
      >
        {produto.nome}
      </button>
      <div className="text-right text-xs tabular-nums text-primary-text md:text-sm">
        {formatCurrency(produto.valor)}
      </div>
      <div className="flex items-center justify-end gap-0.5">
        <span className="mr-0.5 w-4 text-center text-[11px] tabular-nums text-secondary-text">
          {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onMove(produto.id, 'up')}
          disabled={!canMoveUp}
          className="rounded p-0.5 text-secondary-text transition hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Subir ${produto.nome}`}
          title="Subir"
        >
          <MdKeyboardArrowUp size={18} />
        </button>
        <button
          type="button"
          onClick={() => onMove(produto.id, 'down')}
          disabled={!canMoveDown}
          className="rounded p-0.5 text-secondary-text transition hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Descer ${produto.nome}`}
          title="Descer"
        >
          <MdKeyboardArrowDown size={18} />
        </button>
        <button
          type="button"
          className="cursor-grab touch-manipulation rounded border border-gray-200 bg-white p-1 text-secondary-text transition hover:border-primary/40 hover:text-primary active:cursor-grabbing"
          {...attributes}
          {...listeners}
          style={{ touchAction: 'none' }}
          title="Arrastar para reordenar"
          aria-label={`Arrastar ${produto.nome}`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16M4 15h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

