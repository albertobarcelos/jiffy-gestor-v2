'use client'

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { RelatorioProdutoVendidoLinhaDTO } from '@/src/shared/types/relatoriosProdutosVendidosApi'
import type { ProdutoRankingAnteriorDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda, formatarVariacaoPct } from '../utils/mvpFormatPt'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

/** Linha da lista — mesmo padrão flex de GruposComplementosList e demais telas. */
const ROW_FLEX = 'flex w-full min-w-0 items-center gap-[10px] px-2'

const COL_INDEX = 'w-6 shrink-0 tabular-nums'
const COL_ABC = 'w-9 shrink-0'
const COL_PRODUTO = 'min-w-0 flex-[2]'
const COL_FLEX = 'min-w-0 flex-1'
const COL_FLEX_RIGHT = `${COL_FLEX} text-right`

const COL_VAR_QTD_TITLE =
  'Variação percentual da quantidade vendida em relação ao período anterior (mesmos filtros)'
const COL_VAR_FAT_TITLE =
  'Variação percentual do faturamento em relação ao período anterior (mesmos filtros)'

function ThCell({
  children,
  className = '',
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <div className={className} title={title}>
      {children}
    </div>
  )
}

function variacaoPctTextClass(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return 'text-primary-text'
  if (p < 0) return 'text-red-500'
  if (p > 0) return 'text-accent5'
  return 'text-primary-text'
}

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
  isFetchingNextPage: boolean
  hasNextPage: boolean
  onLoadMore: () => void
}) {
  const {
    items,
    rankingsPorProduto,
    totalFiltrado,
    isFetchingNextPage,
    hasNextPage,
    onLoadMore,
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
  }, [rows.length])

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return
    const container = scrollContainerRef.current
    if (!container) return
    if (container.scrollHeight <= container.clientHeight + 8) {
      onLoadMore()
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore, rows.length])

  const shellClass =
    'm-1 flex h-[90vh] min-h-[min(90vh,32rem)] flex-col overflow-hidden rounded-lg bg-info'

  if (!rows.length) {
    return (
      <div className={`${shellClass} items-center justify-center`}>
        <p className="font-nunito text-secondary-text">Nenhum produto encontrado para os filtros selecionados.</p>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <div className="hidden shrink-0 md:block">
        <div
          className={`font-nunito ${ROW_FLEX} h-10 rounded-t-lg bg-custom-2 text-xs font-semibold text-primary-text md:text-sm`}
        >
          <ThCell className={COL_INDEX}>#</ThCell>
          <ThCell className={COL_ABC}>ABC</ThCell>
          <ThCell className={COL_PRODUTO}>Produto</ThCell>
          <ThCell className={`${COL_FLEX} hidden lg:block`}>Grupo</ThCell>
          <ThCell className={COL_FLEX_RIGHT}>Qtd</ThCell>
          <ThCell className={`${COL_FLEX_RIGHT} leading-tight`} title={COL_VAR_QTD_TITLE}>
            <span className="block">% Qtd</span>
          </ThCell>
          <ThCell className={`${COL_FLEX_RIGHT} leading-tight`} title={COL_VAR_FAT_TITLE}>
            <span className="block">% Faturamento</span>
          </ThCell>
          <ThCell className={COL_FLEX_RIGHT}>Faturamento</ThCell>
          <ThCell className={COL_FLEX_RIGHT}>Preço médio</ThCell>
        </div>
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
              className={`font-nunito ${ROW_FLEX} mb-0.5 rounded-lg py-1.5 transition-colors hover:bg-primary/10 ${
                isZebraEven ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className={`${COL_INDEX} text-secondary-text`}>{idx + 1}</div>
              <div className={COL_ABC}>
                <BadgeAbc classe={row.classeAbc} />
              </div>
              <div className={COL_PRODUTO}>
                <span className="line-clamp-2 text-sm font-medium text-primary-text" title={row.nome}>
                  {row.nome}
                </span>
              </div>
              <div className={`${COL_FLEX} hidden lg:block`}>
                <span className="line-clamp-2 text-xs text-secondary-text" title={row.grupoNome ?? ''}>
                  {row.grupoNome ?? '—'}
                </span>
              </div>
              <div className={`${COL_FLEX_RIGHT} text-sm tabular-nums text-primary-text`}>
                {row.quantidade.toLocaleString('pt-BR')}
              </div>
              <div
                className={`${COL_FLEX_RIGHT} text-xs tabular-nums ${variacaoPctTextClass(row.ranking?.variacaoQtdPct)}`}
                title={COL_VAR_QTD_TITLE}
              >
                {formatarVariacaoPct(row.ranking?.variacaoQtdPct)}
              </div>
              <div
                className={`${COL_FLEX_RIGHT} text-xs tabular-nums ${variacaoPctTextClass(row.ranking?.variacaoValorPct)}`}
                title={COL_VAR_FAT_TITLE}
              >
                {formatarVariacaoPct(row.ranking?.variacaoValorPct)}
              </div>
              <div className={`${COL_FLEX_RIGHT} text-sm tabular-nums text-primary-text`}>
                {formatarMoeda(row.valorTotal)}
              </div>
              <div className={`${COL_FLEX_RIGHT} text-sm tabular-nums text-primary-text`}>
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
