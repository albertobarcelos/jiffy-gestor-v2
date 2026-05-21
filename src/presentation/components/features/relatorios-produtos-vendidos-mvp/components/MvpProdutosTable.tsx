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

/** Grade estilo planilha (bordas visíveis, sem cantos arredondados nas linhas). */
const GRID_BORDER = 'border border-[#d0d7de]'
const TH_BASE = `${GRID_BORDER} bg-[#f3f4f6] px-2 py-1.5 text-xs font-semibold text-primary-text align-middle`
const TD_BASE = `${GRID_BORDER} px-2 py-1.5 align-middle`

/** Largura mínima por coluna — tabela pode ultrapassar a viewport (scroll horizontal). */
const COL_ALIGN: Record<MvpColunaId, string> = {
  index: 'w-10 min-w-[2.5rem] text-center tabular-nums',
  abc: 'w-11 min-w-[2.75rem] text-center',
  produto: 'w-52 min-w-[12rem] max-w-[16rem] text-left',
  grupo: 'w-36 min-w-[7rem] max-w-[11rem] text-left',
  quantidade: 'w-24 min-w-[4.75rem] text-right tabular-nums',
  varQtd: 'w-28 min-w-[6.75rem] text-right tabular-nums',
  varFat: 'w-28 min-w-[6.75rem] text-right tabular-nums',
  faturamento: 'w-28 min-w-[6.5rem] text-right tabular-nums',
  precoMedio: 'w-28 min-w-[6.25rem] text-right tabular-nums',
  pctUnidades: 'w-24 min-w-[5.5rem] text-right tabular-nums',
  pctFaturamento: 'w-24 min-w-[5.5rem] text-right tabular-nums',
  valorCardapio: 'w-28 min-w-[6.5rem] text-right tabular-nums',
  deltaPrecoVsCardapio: 'w-24 min-w-[5.75rem] text-right tabular-nums',
}

const COL_VAR_QTD_TITLE =
  'Variação percentual da quantidade vendida em relação ao período anterior (mesmos filtros)'
const COL_VAR_FAT_TITLE =
  'Variação percentual do faturamento em relação ao período anterior (mesmos filtros)'

const COLUNA_LABEL: Record<MvpColunaId, string> = Object.fromEntries(
  MVP_COLUNA_CATALOGO.map(c => [c.id, c.label])
) as Record<MvpColunaId, string>

function variacaoPctTextClass(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return 'text-primary-text'
  if (p < 0) return 'text-red-500'
  if (p > 0) return 'text-accent5'
  return 'text-primary-text'
}

function BadgeAbc({ classe }: { classe: RelatorioProdutoVendidoLinhaDTO['classeAbc'] }) {
  const base = 'inline-flex min-w-[1.75rem] justify-center px-1.5 py-0.5 text-xs font-bold'
  if (classe === 'A') {
    return <span className={`${base} bg-accent5/20 text-accent5`}>A</span>
  }
  if (classe === 'B') {
    return <span className={`${base} bg-primary/20 text-primary`}>B</span>
  }
  return <span className={`${base} bg-red-500/20 text-red-500`}>C</span>
}

function colAlign(id: MvpColunaId): string {
  return COL_ALIGN[id]
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

function tdExtraClass(id: MvpColunaId, row: RowComRanking): string {
  if (id === 'varQtd') {
    return `text-xs ${variacaoPctTextClass(row.ranking?.variacaoQtdPct)}`
  }
  if (id === 'varFat') {
    return `text-xs ${variacaoPctTextClass(row.ranking?.variacaoValorPct)}`
  }
  if (id !== 'produto' && id !== 'index' && id !== 'abc' && id !== 'grupo') {
    return 'text-sm text-primary-text'
  }
  return ''
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
      className={`inline-flex shrink-0 items-center justify-center p-0.5 transition-colors hover:bg-primary/15 ${
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

  const shellClass =
    'm-1 flex max-h-[min(90vh,32rem)] flex-col overflow-hidden border border-[#d0d7de] bg-white'

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
        className="scrollbar-thin max-h-[calc(min(90vh,32rem)-2.75rem)] overflow-auto overscroll-contain"
      >
        <table className="font-nunito w-max min-w-full border-collapse bg-white text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              {colunas.map(id => {
                const colunaSort = COLUNA_SORT_MAP[id]
                return (
                  <th
                    key={id}
                    scope="col"
                    className={`${TH_BASE} ${colAlign(id)}`}
                    title={headerTitle(id)}
                  >
                    {colunaSort ? (
                      <span className="inline-flex w-full items-center justify-end gap-0.5">
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
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.produtoId}
                className={`transition-colors hover:bg-[#e8f4fc] ${
                  idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'
                }`}
              >
                {colunas.map(id => {
                  const isVar = id === 'varQtd' || id === 'varFat'
                  return (
                    <td
                      key={id}
                      className={`${TD_BASE} ${colAlign(id)} ${tdExtraClass(id, row)}`}
                      title={isVar ? headerTitle(id) : undefined}
                    >
                      {renderCell(id, row, idx)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {isFetchingNextPage ? (
          <div className="flex justify-center border-t border-[#d0d7de] bg-white py-4" aria-busy="true">
            <JiffyLoading />
          </div>
        ) : null}
      </div>

      {exibirRodapeContagem && totalFiltrado > 0 ? (
        <p className="font-nunito shrink-0 border-t border-[#d0d7de] bg-[#f9fafb] px-3 py-2 text-xs text-secondary-text">
          Exibindo {rows.length} de {totalFiltrado} produtos
          {hasNextPage ? ' — role para carregar mais' : ''}
        </p>
      
      ) : null}
    </div>
  )
}
