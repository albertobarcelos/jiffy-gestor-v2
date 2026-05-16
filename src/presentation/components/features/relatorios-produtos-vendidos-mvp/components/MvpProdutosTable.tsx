'use client'

import { useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { RelatorioProdutoVendidoLinhaDTO } from '@/src/shared/types/relatoriosProdutosVendidosApi'
import type { ProdutoRankingAnteriorDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda, formatarVariacaoPct } from '../utils/mvpFormatPt'

type RowTableMvp = RelatorioProdutoVendidoLinhaDTO & {
  ranking?: ProdutoRankingAnteriorDTO | undefined
}

function BadgeAbc({ classe }: { classe: RowTableMvp['classeAbc'] }) {
  const base = 'inline-flex min-w-[1.75rem] justify-center rounded px-1.5 py-0.5 text-xs font-bold'
  if (classe === 'A') {
    return <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200`}>A</span>
  }
  if (classe === 'B') {
    return <span className={`${base} bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200`}>B</span>
  }
  return <span className={`${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`}>C</span>
}

const helper = createColumnHelper<RowTableMvp>()

export function MvpProdutosTable(props: {
  items: RelatorioProdutoVendidoLinhaDTO[]
  rankingsPorProduto: ProdutoRankingAnteriorDTO[]
  mockAtivo: boolean
  offset: number
  isLoading: boolean
  isError: boolean
  errorMessage?: string
}) {
  const { items, rankingsPorProduto, mockAtivo, offset, isLoading, isError, errorMessage } = props

  const rows = useMemo(() => {
    const mapRank = new Map(rankingsPorProduto.map(r => [r.produtoId, r]))
    return items.map(it => ({
      ...it,
      ranking: mapRank.get(it.produtoId),
    }))
  }, [items, rankingsPorProduto])

  const columns = useMemo(
    () => [
      helper.display({
        id: 'idx',
        header: '#',
        cell: ({ row }) => offset + row.index + 1,
      }),
      helper.accessor(row => row.classeAbc, {
        id: 'abc',
        header: 'ABC',
        cell: info => <BadgeAbc classe={info.getValue()} />,
      }),
      helper.accessor('nome', {
        header: 'Produto',
        cell: info => (
          <span className="line-clamp-2 font-medium dark:text-gray-100" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      helper.accessor('grupoNome', {
        header: 'Grupo',
        cell: info => (
          <span className="line-clamp-2 dark:text-gray-300" title={info.getValue() ?? ''}>
            {info.row.original.grupoNome ?? '—'}
          </span>
        ),
      }),
      helper.accessor('quantidade', {
        header: () => <span className="block text-right">Qtd</span>,
        cell: info => (
          <span className="block text-right tabular-nums">{info.getValue().toLocaleString('pt-BR')}</span>
        ),
      }),
      helper.accessor(row => row.ranking?.variacaoQtdPct, {
        id: 'vq',
        header: () => <span className="block text-right">Δ&nbsp;qtd%</span>,
        cell: info => (
          <span className="block text-right">{formatarVariacaoPct(info.getValue())}</span>
        ),
      }),
      helper.accessor(row => row.ranking?.variacaoValorPct, {
        id: 'vv',
        header: () => <span className="block text-right">Δ&nbsp;fat.%</span>,
        cell: info => (
          <span className="block text-right">{formatarVariacaoPct(info.getValue())}</span>
        ),
      }),
      helper.accessor('valorTotal', {
        header: () => <span className="block text-right">Fat.</span>,
        cell: info => (
          <span className="block text-right">{formatarMoeda(info.getValue())}</span>
        ),
      }),
      helper.accessor('precoMedioVenda', {
        header: () => <span className="block text-right">P. médio</span>,
        cell: info => (
          <span className="block text-right">{formatarMoeda(info.getValue())}</span>
        ),
      }),
      ...(mockAtivo
        ? [
            helper.accessor('margemBrutaPercentual', {
              header: () => <span className="block text-right">Margem (demo)</span>,
              cell: info => {
                const v = info.getValue()
                return (
                  <span className="block text-right">
                    {v != null && Number.isFinite(v) ? `${v.toFixed(0)}%` : '—'}
                  </span>
                )
              },
            }),
          ]
        : []),
    ],
    [mockAtivo, offset]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
        Carregando tabela…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {errorMessage ?? 'Não foi possível carregar o relatório MVP.'}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
        Nenhum produto encontrado para os filtros selecionados.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-950">
      <table className="min-w-[960px] w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
        <thead className="sticky top-0 z-[1] bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-900 dark:text-gray-400">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} className="whitespace-nowrap px-3 py-3">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {table.getRowModel().rows.map(r => (
            <tr key={r.id} className="dark:text-gray-200">
              {r.getVisibleCells().map(c => (
                <td key={c.id} className="px-3 py-2 align-top tabular-nums text-gray-800 dark:text-gray-200">
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
