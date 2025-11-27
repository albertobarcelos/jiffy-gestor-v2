'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo, lazy, Suspense } from 'react'
import { useProdutosInfinite } from '@/src/presentation/hooks/useProdutos'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import Link from 'next/link'
import { Produto } from '@/src/domain/entities/Produto'

// Lazy load do menu de ações para reduzir bundle inicial
const ProdutoActionsMenu = lazy(() => import('./ProdutoActionsMenu').then(module => ({ default: module.ProdutoActionsMenu })))

interface ProdutosListProps {
  onReload?: () => void
}

/**
 * Item individual da lista de produtos (memoizado para evitar re-renders desnecessários)
 */
const ProdutoListItem = memo(function ProdutoListItem({
  produto,
  onStatusChanged,
}: {
  produto: Produto
  onStatusChanged?: () => void
}) {
  const valorFormatado = useMemo(() => transformarParaReal(produto.getValor()), [produto])
  const isAtivo = useMemo(() => produto.isAtivo(), [produto])
  const statusClass = useMemo(
    () =>
      isAtivo
        ? 'bg-success/20 text-success'
        : 'bg-error/20 text-secondary-text',
    [isAtivo]
  )

  return (
    <div className="h-[50px] bg-info rounded-xl px-4 mb-2 flex items-center gap-[10px]">
      <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
        {produto.getCodigoProduto()}
      </div>
      <div className="flex-[4] font-nunito font-semibold text-sm text-primary-text">
        {produto.getNome()}
      </div>
      <div className="flex-[2] font-nunito text-sm text-secondary-text">
        {produto.getNomeGrupo() || 'Sem grupo'}
      </div>
      <div className="flex-[2] font-nunito text-sm text-secondary-text">
        {produto.getEstoque()?.toString() || 'Sem estoque'}
      </div>
      <div className="flex-[2] flex justify-center">
        <div
          className={`w-20 px-3 py-1 rounded-[24px] text-center text-sm font-nunito font-medium ${statusClass}`}
        >
          {isAtivo ? 'Ativo' : 'Desativado'}
        </div>
      </div>
      <div className="flex-[2] font-nunito text-sm text-secondary-text">
        {valorFormatado}
      </div>
      <div className="flex-[2] flex justify-end">
        <Suspense fallback={<div className="h-10 w-10" />}>
          <ProdutoActionsMenu
            produtoId={produto.getId()}
            produtoAtivo={isAtivo}
            onStatusChanged={onStatusChanged}
          />
        </Suspense>
      </div>
    </div>
  )
})

/**
 * Lista de produtos com scroll infinito
 * Usa React Query para cache automático e deduplicação de requisições
 */
export function ProdutosList({ onReload }: ProdutosListProps) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce da busca (500ms)
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

  // Determina o filtro ativo (memoizado)
  const ativoFilter = useMemo<boolean | null>(() => {
    return filterStatus === 'Ativo' ? true : filterStatus === 'Desativado' ? false : null
  }, [filterStatus])

  // Hook otimizado com React Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useProdutosInfinite({
    name: debouncedSearch || undefined,
    ativo: ativoFilter,
    limit: 10,
  })

  // Achatando todas as páginas em uma única lista (memoizado)
  const produtos = useMemo(() => {
    return data?.pages.flatMap((page) => page.produtos) || []
  }, [data])

  const totalProdutos = useMemo(() => {
    return data?.pages[0]?.count || 0
  }, [data])

  // Intersection Observer para carregar 10 em 10
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || !hasNextPage || isFetchingNextPage || isFetching) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetching) {
            fetchNextPage()
          }
        })
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '10px',
        threshold: 0.1,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, produtos.length])

  // Notificar erro
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }, [error])

  const handleStatusChange = useCallback(() => {
    onReload?.()
  }, [onReload])

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Produtos Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {produtos.length} de {totalProdutos}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/produtos/atualizar-preco"
              className="h-10 px-[30px] bg-info text-primary-text border border-secondary rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-secondary-bg transition-colors"
            >
              Atualizar Preços
            </Link>
            <button
              onClick={() => {
                window.location.href = '/produtos/novo'
              }}
              className="h-10 px-[30px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              Novo
              <span className="text-lg">+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Divisor amarelo */}
      <div className="relative">
        <div className="h-[63px] border-t-2 border-alternate"></div>
        <div className="absolute top-3 left-[30px] right-[30px] flex gap-[10px]">
          {/* Barra de pesquisa */}
          <div className="flex-[3]">
            <div className="h-[50px] relative">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full px-5 pl-12 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-secondary font-nunito text-sm"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
                🔍
              </span>
            </div>
          </div>

          {/* Filtro de status */}
          <div className="flex-1">
            <div className="h-[48px]">
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
                }
                className="w-[175px] h-full px-5 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text focus:outline-none focus:border-secondary font-nunito text-sm"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Desativado">Desativado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Código
          </div>
          <div className="flex-[4] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Grupo
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Estoque
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Valor
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de produtos com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {/* Skeleton loaders para carregamento inicial - sempre mostra durante loading */}
        {(isLoading || (produtos.length === 0 && isFetching)) && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-[50px] bg-info rounded-xl px-4 flex items-center gap-[10px] animate-pulse"
              >
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[4] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-6 w-20 mx-auto" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-10 w-10 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {produtos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado.</p>
          </div>
        )}

        {produtos.map((produto) => (
          <ProdutoListItem
            key={produto.getId()}
            produto={produto}
            onStatusChanged={handleStatusChange}
          />
        ))}

        {hasNextPage && !isFetchingNextPage && (
          <div ref={loadMoreRef} className="h-10" />
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
