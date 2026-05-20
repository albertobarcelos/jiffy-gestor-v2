'use client'

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md'
import type {
  RelatorioProdutoVendidoLinhaDTO,
  RelatorioProdutosVendidosSort,
} from '@/src/shared/types/relatoriosProdutosVendidosApi'
import {
  alternarSortPorColuna,
  sortAtivoNaColuna,
  sortEhAsc,
  type MvpColunaOrdenavel,
} from '../relatoriosProdutosVendidosFilters'
import type { ProdutoRankingAnteriorDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import {
  formatarMoeda,
  formatarPercentualParticipacao,
  formatarVariacaoPct,
} from '../utils/mvpFormatPt'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  MVP_COLUNA_CATALOGO,
  ordenarColunasPorCatalogo,
  type MvpColunaId,
} from '../mvpPersonalizacao'

/** Linha com largura pelo conteúdo — permite scroll horizontal quando há muitas colunas. */
const ROW_FLEX =
  'flex w-max min-w-full items-center gap-x-3 gap-y-1 px-3'

/** Largura mínima por coluna (evita espremer; tabela ultrapassa a viewport se necessário). */
const COL_WIDTH: Record<MvpColunaId, string> = {
  index: 'w-10 min-w-[2.5rem] shrink-0 tabular-nums',
  abc: 'w-11 min-w-[2.75rem] shrink-0',
  produto: 'w-52 min-w-[12rem] max-w-[16rem] shrink-0',
  grupo: 'w-36 min-w-[7rem] max-w-[11rem] shrink-0',
  quantidade: 'w-24 min-w-[4.75rem] shrink-0 text-right tabular-nums',
  varQtd: 'w-28 min-w-[6.75rem] shrink-0 text-right tabular-nums',
  varFat: 'w-28 min-w-[6.75rem] shrink-0 text-right tabular-nums',
  faturamento: 'w-28 min-w-[6.5rem] shrink-0 text-right tabular-nums',
  precoMedio: 'w-28 min-w-[6.25rem] shrink-0 text-right tabular-nums',
  pctUnidades: 'w-24 min-w-[5.5rem] shrink-0 text-right tabular-nums',
  pctFaturamento: 'w-24 min-w-[5.5rem] shrink-0 text-right tabular-nums',
  valorCardapio: 'w-28 min-w-[6.5rem] shrink-0 text-right tabular-nums',
  deltaPrecoVsCardapio: 'w-24 min-w-[5.75rem] shrink-0 text-right tabular-nums',
}

const COL_VAR_QTD_TITLE =
  'Variação percentual da quantidade vendida em relação ao período anterior (mesmos filtros)'
const COL_VAR_FAT_TITLE =
  'Variação percentual do faturamento em relação ao período anterior (mesmos filtros)'

const COLUNA_LABEL: Record<MvpColunaId, string> = Object.fromEntries(
  MVP_COLUNA_CATALOGO.map(c => [c.id, c.label])
) as Record<MvpColunaId, string>

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

function colClass(id: MvpColunaId): string {
  return COL_WIDTH[id]
}

type RowComRanking = RelatorioProdutoVendidoLinhaDTO & {
  ranking?: ProdutoRankingAnteriorDTO
}

function renderCell(id: MvpColunaId, row: RowComRanking, idx: number): ReactNode {
  switch (id) {
    case 'index':
      return <span className="text-secondary-text">{idx + 1}</span>
    case 'abc':
      return <BadgeAbc classe={row.classeAbc} />
    case 'produto':
      return (
        <span className="line-clamp-2 text-sm font-medium text-primary-text" title={row.nome}>
          {row.nome}
        </span>
      )
    case 'grupo':
      return (
        <span className="line-clamp-2 text-xs text-secondary-text" title={row.grupoNome ?? ''}>
          {row.grupoNome ?? '—'}
        </span>
      )
    case 'quantidade':
      return row.quantidade.toLocaleString('pt-BR')
    case 'varQtd':
      return formatarVariacaoPct(row.ranking?.variacaoQtdPct)
    case 'varFat':
      return formatarVariacaoPct(row.ranking?.variacaoValorPct)
    case 'faturamento':
      return formatarMoeda(row.valorTotal)
    case 'precoMedio':
      return formatarMoeda(row.precoMedioVenda)
    case 'pctUnidades':
      return formatarPercentualParticipacao(row.percentualUnidades, 1)
    case 'pctFaturamento':
      return formatarPercentualParticipacao(row.percentualFaturamento, 1)
    case 'valorCardapio':
      return row.valorCardapio != null ? formatarMoeda(row.valorCardapio) : '—'
    case 'deltaPrecoVsCardapio':
      return formatarVariacaoPct(row.deltaPrecoVsCardapioPercentual, 1)
    default:
      return null
  }
}

function headerTitle(id: MvpColunaId): string | undefined {
  if (id === 'varQtd') return COL_VAR_QTD_TITLE
  if (id === 'varFat') return COL_VAR_FAT_TITLE
  const meta = MVP_COLUNA_CATALOGO.find(c => c.id === id)
  return meta?.hint
}

const COLUNA_SORT_MAP: Partial<Record<MvpColunaId, MvpColunaOrdenavel>> = {
  quantidade: 'quantidade',
  faturamento: 'faturamento',
}

function MvpColunaSortButton({
  coluna,
  sort,
  onSortChange,
}: {
  coluna: MvpColunaOrdenavel
  sort: RelatorioProdutosVendidosSort
  onSortChange: (next: RelatorioProdutosVendidosSort) => void
}) {
  const ativo = sortAtivoNaColuna(sort, coluna)
  const asc = ativo && sortEhAsc(sort)
  const Icon = asc ? MdArrowUpward : MdArrowDownward
  const ordemLabel = asc ? 'crescente' : 'decrescente'
  const colunaLabel = coluna === 'quantidade' ? 'quantidade' : 'faturamento'

  return (
    <button
      type="button"
      onClick={() => onSortChange(alternarSortPorColuna(sort, coluna))}
      className={`inline-flex shrink-0 items-center justify-center rounded p-0.5 transition-colors hover:bg-primary/15 ${
        ativo ? 'text-primary' : 'text-secondary-text/70'
      }`}
      aria-label={`Ordenar por ${colunaLabel} em ordem ${ordemLabel}. Clique para alternar.`}
      title={`Ordenar ${colunaLabel} (${ordemLabel})`}
    >
      <Icon size={18} aria-hidden />
    </button>
  )
}

export function MvpProdutosTable(props: {
  items: RelatorioProdutoVendidoLinhaDTO[]
  rankingsPorProduto: ProdutoRankingAnteriorDTO[]
  totalFiltrado: number
  colunasVisiveis: MvpColunaId[]
  sort: RelatorioProdutosVendidosSort
  onSortChange: (next: RelatorioProdutosVendidosSort) => void
  isFetchingNextPage: boolean
  hasNextPage: boolean
  onLoadMore: () => void
  /** Quando false, não repete contagem de SKUs no rodapé (ex.: já na barra de somatórias). */
  exibirRodapeContagem?: boolean
}) {
  const {
    items,
    rankingsPorProduto,
    totalFiltrado,
    colunasVisiveis,
    sort,
    onSortChange,
    isFetchingNextPage,
    hasNextPage,
    onLoadMore,
    exibirRodapeContagem = true,
  } = props

  const colunas = useMemo(() => {
    const ids = colunasVisiveis.length ? colunasVisiveis : (['produto'] as MvpColunaId[])
    return ordenarColunasPorCatalogo(ids)
  }, [colunasVisiveis])

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

  /** Altura atual vira teto; com poucas linhas o bloco acompanha o conteúdo. */
  const shellClass =
    'm-1 flex max-h-[min(90vh,32rem)] flex-col overflow-hidden rounded-lg bg-info'

  if (!rows.length) {
    return (
      <div className={`${shellClass} min-h-[10rem] items-center justify-center py-10`}>
        <p className="font-nunito text-secondary-text">Nenhum produto encontrado para os filtros selecionados.</p>
      </div>
    )
  }

  const muitasColunas = colunas.length > 8

  return (
    <div className={shellClass}>
      <div
        ref={scrollContainerRef}
        className="scrollbar-thin max-h-[calc(min(90vh,32rem)-2.75rem)] overflow-auto overscroll-contain px-1 py-1"
      >
        <div className="w-max min-w-full">
          <div
            className={`font-nunito ${ROW_FLEX} sticky top-0 z-10 min-h-10 rounded-t-lg bg-custom-2 py-2 text-xs font-semibold text-primary-text shadow-sm md:text-sm`}
          >
            {colunas.map(id => {
              const colunaSort = COLUNA_SORT_MAP[id]
              return (
                <ThCell
                  key={id}
                  className={colClass(id)}
                  title={headerTitle(id)}
                >
                  {colunaSort ? (
                    <span className="flex items-center justify-end gap-0.5">
                      <span className="whitespace-nowrap">{COLUNA_LABEL[id]}</span>
                      <MvpColunaSortButton
                        coluna={colunaSort}
                        sort={sort}
                        onSortChange={onSortChange}
                      />
                    </span>
                  ) : id === 'varQtd' || id === 'varFat' ? (
                    <span className="block whitespace-normal leading-tight">{COLUNA_LABEL[id]}</span>
                  ) : (
                    <span className="block whitespace-nowrap">{COLUNA_LABEL[id]}</span>
                  )}
                </ThCell>
              )
            })}
          </div>

          {rows.map((row, idx) => {
            const isZebraEven = idx % 2 === 0
            return (
              <div
                key={row.produtoId}
                className={`font-nunito ${ROW_FLEX} mb-0.5 rounded-lg py-2 transition-colors hover:bg-primary/10 ${
                  isZebraEven ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                {colunas.map(id => {
                  const isVar = id === 'varQtd' || id === 'varFat'
                  const cell = renderCell(id, row, idx)
                  return (
                    <div
                      key={id}
                      className={`${colClass(id)} ${
                        isVar
                          ? `text-xs ${variacaoPctTextClass(
                              id === 'varQtd'
                                ? row.ranking?.variacaoQtdPct
                                : row.ranking?.variacaoValorPct
                            )}`
                          : id !== 'produto' && id !== 'index' && id !== 'abc' && id !== 'grupo'
                            ? 'text-sm text-primary-text'
                            : ''
                      }`}
                      title={isVar ? headerTitle(id) : undefined}
                    >
                      {cell}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {isFetchingNextPage ? (
            <div className="flex justify-center py-4" aria-busy="true">
              <JiffyLoading />
            </div>
          ) : null}
        </div>
      </div>

      {exibirRodapeContagem && totalFiltrado > 0 ? (
        <p className="font-nunito shrink-0 border-t border-primary/10 px-3 py-2 text-xs text-secondary-text">
          Exibindo {rows.length} de {totalFiltrado} produtos
          {hasNextPage ? ' — role para carregar mais' : ''}
          {muitasColunas ? ' — role horizontalmente para ver todas as colunas' : ''}
        </p>
      ) : hasNextPage ? (
        <p className="font-nunito shrink-0 border-t border-primary/10 px-3 py-2 text-xs text-secondary-text">
          Role para carregar mais produtos
          {muitasColunas ? ' — role horizontalmente para ver todas as colunas' : ''}
        </p>
      ) : muitasColunas ? (
        <p className="font-nunito shrink-0 border-t border-primary/10 px-3 py-2 text-xs text-secondary-text">
          Role horizontalmente para ver todas as colunas
        </p>
      ) : null}
    </div>
  )
}
