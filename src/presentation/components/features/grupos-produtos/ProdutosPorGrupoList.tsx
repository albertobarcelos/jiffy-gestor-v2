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
import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { ProdutosTabsModal, ProdutosTabsModalState } from '../produtos/ProdutosTabsModal'

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
  } = useInfiniteQuery<ProdutosResponse>({
    queryKey: ['produtos-por-grupo', grupoProdutoId],
    initialPageParam: 0,
    enabled: !!grupoProdutoId,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `/api/grupos-produtos/${grupoProdutoId}/produtos?limit=${PAGE_SIZE}&offset=${pageParam}`
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Erro ao carregar produtos do grupo')
      }

      return res.json()
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && typeof lastPage.nextOffset === 'number'
        ? lastPage.nextOffset
        : undefined,
  })

  const serverProdutos = useMemo(() => {
    return data?.pages.flatMap((page) => page.items || []) ?? []
  }, [data])

  useEffect(() => {
    setLocalProdutos(serverProdutos)
  }, [serverProdutos])

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
    setTabsModalState({
      open: true,
      tab: 'produto',
      mode: 'create',
      produto: undefined,
      prefillGrupoProdutoId: grupoProdutoId,
      grupoId: undefined,
    })
  }, [grupoProdutoId])

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

  const handleTabsModalTabChange = useCallback(
    (tab: 'produto' | 'complementos' | 'impressoras' | 'grupo') => {
      setTabsModalState((prev) => ({
        ...prev,
        tab,
      }))
    },
    []
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
      setLocalProdutos(updatedState)

      const novaPosicao = newIndex + 1
      try {
        const response = await fetch(`/api/produtos/${active.id}/reordena-produto`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ novaPosicao }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.message || 'Erro ao reordenar produto')
        }

        showToast.success('Ordem do produto atualizada com sucesso!')
        refetch()
      } catch (err: any) {
        console.error('Erro ao reordenar produto:', err)
        setLocalProdutos(previousState)
        showToast.error(err?.message || 'Erro ao reordenar produto')
      }
    },
    [localProdutos, refetch]
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-2 gap-4">
        <p className="text-secondary-text text-sm text-center">
          Não foi possível carregar os produtos deste grupo.
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
        <p className="text-secondary-text text-sm font-nunito">
          Nenhum produto associado a este grupo.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col md:mx-2 mx-1 h-full border border-primary/20 rounded-lg bg-white shadow-sm">
      <div className="md:px-6 px-2 pt-2 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="md:text-lg text-sm font-semibold text-primary-text">
              Produtos vinculados ao grupo
            </h3>
            <p className="md:text-sm text-xs text-secondary-text">
              Arraste para reordenar a posição dos produtos
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNovoProdutoModal}
            className="md:h-8 md:px-[10px] px-2 py-1 md:py-0 bg-primary text-info rounded-lg font-semibold font-exo md:text-sm text-xs flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
            Novo produto
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Atualizar
          </button>
          </div>
        </div>
      </div>

      <div className="md:mx-2 mx-1 px-2 md:px-6 py-3 bg-custom-2 rounded-lg grid grid-cols-12 text-xs font-semibold text-primary-text">
        <div className="col-span-1">#</div>
        <div className="col-span-6">Produto</div>
        <div className="col-span-3">Valor</div>
        <div className="col-span-2 text-right pr-5">Ordenar</div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto md:px-6 px-1 py-4 space-y-2">
      {isLoading && localProdutos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <img
            src="/images/jiffy-loading.gif"
            alt="Carregando"
            className="w-20 object-contain"
          />
          <p className="text-sm text-secondary-text text-center">Carregando produtos...</p>
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
                formatCurrency={formatCurrency}
              />
            ))}
          </SortableContext>
        </DndContext>

        {hasNextPage && (
          <div ref={loadMoreRef} className="py-4">
            {isFetchingNextPage && (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      <ProdutosTabsModal
        state={tabsModalState}
        onClose={handleCloseTabsModal}
        onReload={(produtoId?: string, produtoData?: any) => {
          // Se temos dados do produto, podemos atualizar o cache local
          // Caso contrário, apenas refaz a requisição
          if (produtoId && produtoData) {
            // Atualizar produto na lista local se estiver presente
            setLocalProdutos((prev) =>
              prev.map((p) => (p.id === produtoId ? { ...p, ...produtoData } : p))
            )
          }
          // Sempre refaz a requisição para garantir sincronização
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
  formatCurrency,
}: {
  produto: ProdutoGrupo
  index: number
  formatCurrency: (value: number) => string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-12 gap-3 items-center rounded-lg md:px-4 px-1 py-2 transition ${
        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
      } ${isDragging ? 'opacity-50 ring-2 ring-primary/40' : ''}`}
    >
      <div className="col-span-1 md:text-sm text-xs font-semibold text-primary-text">{index + 1}</div>
      <div className="col-span-6 md:text-sm text-xs text-primary-text whitespace-normal break-words">
        {produto.nome}
      </div>
      <div className="col-span-3 md:text-sm text-xs text-primary-text">{formatCurrency(produto.valor)}</div>
      <div
        className="col-span-2 flex justify-end pr-2 cursor-grab active:cursor-grabbing text-secondary-text hover:text-primary active:text-primary transition touch-manipulation min-h-[35px] items-center"
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        title="Arraste para reordenar"
      >
        <svg
          className="md:w-5 md:h-5 w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16M4 15h16" />
        </svg>
      </div>
    </div>
  )
}

