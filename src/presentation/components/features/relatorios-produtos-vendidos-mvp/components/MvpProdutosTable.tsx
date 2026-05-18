'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { RelatorioProdutoVendidoLinhaDTO } from '@/src/shared/types/relatoriosProdutosVendidosApi'
import type { ProdutoRankingAnteriorDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda, formatarVariacaoPct } from '../utils/mvpFormatPt'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

function BadgeAbc({ classe }: { classe: RelatorioProdutoVendidoLinhaDTO['classeAbc'] }) {
  const base = 'inline-flex min-w-[1.75rem] justify-center rounded px-1.5 py-0.5 text-xs font-bold'
  if (classe === 'A') {
    return <span className={`${base} bg-accent5/20 text-accent5`}>A</span>
  }
  if (classe === 'B') {
    return <span className={`${base} bg-primary/20 text-primary`}>B</span>
  }
  return <span className={`${base} bg-red-500/20 text-red-500`}>C</span>
}

export function MvpProdutosTable(props: {
  items: RelatorioProdutoVendidoLinhaDTO[]
  rankingsPorProduto: ProdutoRankingAnteriorDTO[]
  totalFiltrado: number
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  onLoadMore: () => void
  isError: boolean
  errorMessage?: string
}) {
  const {
    items,
    rankingsPorProduto,
    totalFiltrado,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    onLoadMore,
    isError,
    errorMessage,
  } = props

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rows = useMemo(() => {
    const mapRank = new Map(rankingsPorProduto.map(r => [r.produtoId, r]))
    return items.map(it => ({
      ...it,
      ranking: mapRank.get(it.produtoId),
    }))
  }, [items, rankingsPorProduto])

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) return
    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) {
        scrollTimeoutRef.current = null
        return
      }
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      if (distanceFromBottom < 400 && hasNextPage && !isFetchingNextPage) {
        onLoadMore()
      }
      scrollTimeoutRef.current = null
    }, 100)
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

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

  /** No topo/fim da lista, repassa a rolagem do mouse para a página (gráficos e filtros acima). */
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      const delta = e.deltaY
      if (delta === 0) return

      const { scrollTop, scrollHeight, clientHeight } = container
      const maxScroll = Math.max(0, scrollHeight - clientHeight)
      const atTop = scrollTop <= 0
      const atBottom = scrollTop >= maxScroll - 1

      if (!((atTop && delta < 0) || (atBottom && delta > 0))) return

      let parent: HTMLElement | null = container.parentElement
      while (parent) {
        const { overflowY } = getComputedStyle(parent)
        if (
          (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
          parent.scrollHeight > parent.clientHeight
        ) {
          parent.scrollTop += delta
          return
        }
        parent = parent.parentElement
      }
      window.scrollBy(0, delta)
    }

    container.addEventListener('wheel', onWheel, { passive: true })
    return () => container.removeEventListener('wheel', onWheel)
  }, [rows.length, isLoading, isError])

  useEffect(() => {
    if (!hasNextPage || isLoading || isFetchingNextPage) return
    const container = scrollContainerRef.current
    if (!container) return
    if (container.scrollHeight <= container.clientHeight + 8) {
      onLoadMore()
    }
  }, [hasNextPage, isLoading, isFetchingNextPage, onLoadMore, rows.length])

  const shellClass =
    'm-1 flex h-[90vh] min-h-[min(90vh,32rem)] flex-col overflow-hidden rounded-lg bg-info'

  if (isLoading && rows.length === 0) {
    return (
      <div className={`${shellClass} items-center justify-center`}>
        <JiffyLoading />
      </div>
    )
  }

  if (isError && rows.length === 0) {
    return (
      <div className={`${shellClass} justify-center p-4`}>
        <p className="text-sm text-error">{errorMessage ?? 'Não foi possível carregar o relatório de produtos vendidos.'}</p>
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className={`${shellClass} items-center justify-center`}>
        <p className="font-nunito text-secondary-text">Nenhum produto encontrado para os filtros selecionados.</p>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <div className="font-nunito hidden shrink-0 gap-2 rounded-t-lg bg-custom-2 py-2 text-xs font-semibold text-primary-text md:flex md:px-3 md:text-sm">
        <div className="w-8 shrink-0">#</div>
        <div className="w-10 shrink-0">ABC</div>
        <div className="min-w-[140px] flex-[2]">Produto</div>
        <div className="hidden min-w-[100px] flex-1 lg:block">Grupo</div>
        <div className="w-14 shrink-0 text-right">Qtd</div>
        <div className="w-16 shrink-0 text-right">Δ qtd</div>
        <div className="w-16 shrink-0 text-right">Δ fat.</div>
        <div className="w-24 shrink-0 text-right">Faturamento</div>
        <div className="w-20 shrink-0 text-right">P. médio</div>
      </div>

      <div
        ref={scrollContainerRef}
        className="scrollbar-hide min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-y-auto px-1 py-2"
      >
        {rows.map((row, idx) => {
          const isZebraEven = idx % 2 === 0
          return (
            <div
              key={row.produtoId}
              className={`font-nunito mb-0.5 flex min-w-[720px] items-center gap-2 rounded-lg py-1.5 transition-colors hover:bg-primary/10 md:px-2 ${
                isZebraEven ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="w-8 shrink-0 tabular-nums text-secondary-text">{idx + 1}</div>
              <div className="w-10 shrink-0">
                <BadgeAbc classe={row.classeAbc} />
              </div>
              <div className="min-w-[140px] flex-[2]">
                <span className="line-clamp-2 text-sm font-medium text-primary-text" title={row.nome}>
                  {row.nome}
                </span>
              </div>
              <div className="hidden min-w-[100px] flex-1 lg:block">
                <span className="line-clamp-2 text-xs text-secondary-text" title={row.grupoNome ?? ''}>
                  {row.grupoNome ?? '—'}
                </span>
              </div>
              <div className="w-14 shrink-0 text-right tabular-nums text-sm text-primary-text">
                {row.quantidade.toLocaleString('pt-BR')}
              </div>
              <div className="w-16 shrink-0 text-right text-xs tabular-nums text-primary-text">
                {formatarVariacaoPct(row.ranking?.variacaoQtdPct)}
              </div>
              <div className="w-16 shrink-0 text-right text-xs tabular-nums text-primary-text">
                {formatarVariacaoPct(row.ranking?.variacaoValorPct)}
              </div>
              <div className="w-24 shrink-0 text-right text-sm tabular-nums text-primary-text">
                {formatarMoeda(row.valorTotal)}
              </div>
              <div className="w-20 shrink-0 text-right text-sm tabular-nums text-primary-text">
                {formatarMoeda(row.precoMedioVenda)}
              </div>
            </div>
          )
        })}

        {isFetchingNextPage ? (
          <div className="flex justify-center py-4" aria-busy="true">
            <JiffyLoading />
          </div>
        ) : null}
      </div>

      {totalFiltrado > 0 ? (
        <p className="font-nunito shrink-0 border-t border-primary/10 px-3 py-2 text-xs text-secondary-text">
          Exibindo {rows.length} de {totalFiltrado} produtos
          {hasNextPage ? ' — role para carregar mais' : ''}
        </p>
      ) : null}
    </div>
  )
}
