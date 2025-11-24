'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { useProdutosInfinite } from '@/src/presentation/hooks/useProdutos'
import { Skeleton } from '@mui/material'
import React from 'react'

/**
 * Lista de produtos com estoque
 * Otimizada com React Query e memoização
 */

// Componente memoizado para cada item da lista
const ProdutoEstoqueItem = React.memo(({ produto }: { produto: Produto }) => {
  return (
    <div
      className="h-[50px] px-4 flex items-center gap-[10px] border-t border-alternate/20"
    >
      <div className="w-[10%] font-nunito text-sm text-primary-text">
        {produto.getCodigoProduto() || '-'}
      </div>
      <div className="w-[30%] font-nunito font-semibold text-sm text-primary-text">
        {produto.getNome()}
      </div>
      <div className="w-[16%] font-nunito text-sm text-secondary-text">
        {produto.getNomeGrupo() || '-'}
      </div>
      <div className="w-[16%] font-nunito text-sm text-secondary-text">
        {typeof produto.getEstoque() === 'number'
          ? produto.getEstoque()
          : typeof produto.getEstoque() === 'string'
            ? parseInt(produto.getEstoque() as string) || 0
            : 0}
      </div>
      <div className="w-[16%]">
        <div
          className={`w-[80px] px-3 py-1 rounded-[24px] text-center text-sm font-nunito font-medium ${
            produto.isAtivo()
              ? 'bg-success/20 text-success'
              : 'bg-error/20 text-secondary-text'
          }`}
        >
          {produto.isAtivo() ? 'Ativo' : 'Desativado'}
        </div>
      </div>
      <div className="w-[16%] font-nunito font-semibold text-sm text-primary-text">
        {new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(produto.getValor() || 0)}
      </div>
      <div className="w-[10%] flex justify-end">
        <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-secondary-bg/20 transition-colors">
          <span className="text-xl text-primary-text">⋮</span>
        </button>
      </div>
    </div>
  )
})

ProdutoEstoqueItem.displayName = 'ProdutoEstoqueItem'

export function EstoqueProdutosList() {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Hook otimizado com React Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
  } = useProdutosInfinite({
    name: debouncedSearch || undefined,
    limit: 10,
  })

  // Achatando todas as páginas em uma única lista (memoizado)
  const produtos = useMemo(() => {
    return data?.pages.flatMap((page) => page.produtos) || []
  }, [data?.pages])

  const totalProdutos = useMemo(() => {
    return data?.pages[0]?.count || 0
  }, [data?.pages])

  // Handler de scroll com throttle para melhor performance
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

  // Scroll infinito
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-[35px] pt-0 pb-0">
        <div className="h-[90px] flex items-center justify-between">
          <h1 className="text-primary text-2xl font-semibold font-exo">
            Estoque
          </h1>
          <div className="flex items-center gap-[10px]">
            {/* Barra de pesquisa */}
            <div className="w-[300px]">
              <div className="h-[48px] relative">
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
            {/* Badge de notificação */}
            <div className="relative">
              <div className="w-10 h-10 flex items-center justify-center text-secondary-text">
                <span className="text-3xl">🔔</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">1</span>
              </div>
            </div>
            {/* Avatar do usuário */}
            <div className="w-[50px] h-[50px] rounded-full border-2 border-alternate bg-alternate/20 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-hidden bg-primary-bg rounded-tl-[30px]">
        <div className="px-[30px] pt-[30px] pb-[10px]">
          <div className="flex items-start justify-between">
            <div className="pl-5">
              <p className="text-primary text-sm font-semibold font-nunito mb-2">
                Produtos Cadastrados
              </p>
              <div className="flex items-center gap-2">
                <p className="text-tertiary text-[26px] font-medium font-nunito">
                  {produtos.length}
                </p>
                <div className="w-10 h-10 flex items-center justify-center text-secondary-text">
                  <span className="text-2xl">🛒</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {/* Card Baixo Estoque */}
              <div className="w-[160px] h-[60px] bg-info rounded-lg border border-gray-300 flex items-center gap-4 px-4">
                <span className="text-warning text-3xl">📉</span>
                <div>
                  <p className="text-secondary-text text-xs font-medium">
                    Baixo Estoque
                  </p>
                </div>
              </div>
              {/* Botão Movimentar */}
              <button
                onClick={() => window.location.href = '/estoque'}
                className="h-10 px-[30px] bg-primary text-info rounded-[30px] font-medium font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                Movimentar
                <span className="text-base">→</span>
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
              <div className="h-[38px] relative">
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

            {/* Botão Filtrar */}
            <div className="flex-1">
              <button className="h-[40px] px-[30px] rounded-[40px] border-[0.6px] border-secondary bg-info text-secondary font-medium font-exo text-sm flex items-center gap-2 hover:bg-primary-bg transition-colors">
                <span>🔽</span>
                Filtrar
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de produtos */}
        <div className="px-[30px] mt-0">
          <div className="bg-info rounded-lg overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="h-10 bg-custom-2 px-4 flex items-center gap-[10px]">
              <div className="w-[10%] font-nunito font-semibold text-sm text-primary-text">
                Código
              </div>
              <div className="w-[30%] font-nunito font-semibold text-sm text-primary-text">
                Nome
              </div>
              <div className="w-[16%] font-nunito font-semibold text-sm text-primary-text">
                Grupo
              </div>
              <div className="w-[16%] font-nunito font-semibold text-sm text-primary-text">
                Estoque
              </div>
              <div className="w-[16%] font-nunito font-semibold text-sm text-primary-text">
                Status
              </div>
              <div className="w-[16%] font-nunito font-semibold text-sm text-primary-text">
                Valor
              </div>
              <div className="w-[10%] text-right font-nunito font-semibold text-sm text-primary-text">
                Ações
              </div>
            </div>

            {/* Lista de produtos com scroll */}
            <div
              ref={scrollContainerRef}
              className="max-h-[600px] overflow-y-auto"
            >
              {/* Skeleton loaders para carregamento inicial */}
              {(isLoading || (produtos.length === 0 && isFetching)) && (
                <div className="space-y-1">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="h-[50px] px-4 flex items-center gap-[10px] border-t border-alternate/20"
                    >
                      <Skeleton className="w-[10%] h-4" />
                      <Skeleton className="w-[30%] h-4" />
                      <Skeleton className="w-[16%] h-4" />
                      <Skeleton className="w-[16%] h-4" />
                      <Skeleton className="w-[80px] h-6" />
                      <Skeleton className="w-[16%] h-4" />
                      <Skeleton className="w-10 h-10 ml-auto" />
                    </div>
                  ))}
                </div>
              )}

              {produtos.length === 0 && !isLoading && !isFetching && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-secondary-text">Nenhum produto encontrado.</p>
                </div>
              )}

              {produtos.map((produto) => (
                <ProdutoEstoqueItem key={produto.getId()} produto={produto} />
              ))}

              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

