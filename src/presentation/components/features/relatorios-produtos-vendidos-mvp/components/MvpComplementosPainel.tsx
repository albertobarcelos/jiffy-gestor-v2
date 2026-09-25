'use client'

import type {
  RelatorioComplementoImpacto,
  RelatorioComplementoVendidoLinhaDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda } from '../utils/mvpFormatPt'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

const GRID_BORDER = 'border border-[#d0d7de]'
const TH_BASE = `${GRID_BORDER} bg-[#f3f4f6] px-2 py-1.5 text-xs font-semibold text-primary-text align-middle`
const TD_BASE = `${GRID_BORDER} px-2 py-1.5 align-middle`

const COLUNAS = 8
/** Mesmo modelo da aba Produtos: 1 linha de mensagem + (N-1) fantasma. */
const EMPTY_PLACEHOLDER_ROWS = 5

function BadgeImpacto({ impacto }: { impacto: RelatorioComplementoImpacto }) {
  const base = 'inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide'
  if (impacto === 'aumenta') {
    return <span className={`${base} bg-accent5/20 text-accent5`}>Aumenta</span>
  }
  if (impacto === 'diminui') {
    return <span className={`${base} bg-red-500/15 text-red-600`}>Diminui</span>
  }
  return <span className={`${base} bg-gray-200 text-secondary-text`}>Nenhum</span>
}

export function MvpComplementosPainel(props: {
  items: RelatorioComplementoVendidoLinhaDTO[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry?: () => void
}) {
  const { items, isLoading, isError, errorMessage, onRetry } = props
  const vazia = items.length === 0

  const shellClass =
    'm-1 flex max-h-[min(90vh,32rem)] flex-col overflow-hidden border border-[#d0d7de] bg-white'

  if (isLoading) {
    return (
      <div className={`${shellClass} min-h-[12rem] items-center justify-center`}>
        <JiffyLoading />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className={`${shellClass} min-h-[12rem] flex-col items-center justify-center gap-2 px-4 py-8`}
      >
        <p className="text-sm text-red-600">
          {errorMessage || 'Não foi possível carregar os complementos.'}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            Tentar de novo
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <div className="scrollbar-thin max-h-[calc(min(90vh,32rem)-2.75rem)] overflow-auto overscroll-contain">
        <table className="w-max min-w-full border-collapse bg-white text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${TH_BASE} w-10 text-center`}>#</th>
              <th className={`${TH_BASE} text-left`}>Complemento</th>
              <th className={`${TH_BASE} text-left`}>Grupo</th>
              <th className={`${TH_BASE} text-center`}>Impacto</th>
              <th className={`${TH_BASE} text-right`}>Qtd</th>
              <th className={`${TH_BASE} text-right`}>Valor (+)</th>
              <th className={`${TH_BASE} text-right`}>Valor (−)</th>
              <th className={`${TH_BASE} text-right`}>Líquido</th>
            </tr>
          </thead>
          <tbody>
            {vazia ? (
              <>
                <tr className="bg-white">
                  <td
                    colSpan={COLUNAS}
                    className={`${TD_BASE} h-9 px-3 text-left text-sm text-secondary-text`}
                  >
                    Nenhum complemento neste período
                  </td>
                </tr>
                {Array.from({ length: EMPTY_PLACEHOLDER_ROWS - 1 }, (_, idx) => (
                  <tr
                    key={`empty-comp-${idx}`}
                    className={idx % 2 === 0 ? 'bg-[#fafafa]' : 'bg-white'}
                    aria-hidden
                  >
                    {Array.from({ length: COLUNAS }, (_, col) => (
                      <td key={col} className={`${TD_BASE} h-9`}>
                        &nbsp;
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : (
              items.map((row, idx) => (
                <tr
                  key={row.complementoId}
                  className={`transition-colors hover:bg-[#e8f4fc] ${
                    idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'
                  }`}
                >
                  <td className={`${TD_BASE} h-9 text-center tabular-nums text-secondary-text`}>
                    {idx + 1}
                  </td>
                  <td className={`${TD_BASE} h-9 font-medium text-primary-text`}>{row.nome}</td>
                  <td className={`${TD_BASE} h-9 text-secondary-text`}>
                    {row.grupoNome ?? '—'}
                  </td>
                  <td className={`${TD_BASE} h-9 text-center`}>
                    <BadgeImpacto impacto={row.impactoPredominante} />
                  </td>
                  <td className={`${TD_BASE} h-9 text-right tabular-nums`}>{row.quantidade}</td>
                  <td className={`${TD_BASE} h-9 text-right tabular-nums text-accent5`}>
                    {formatarMoeda(row.valorAumenta)}
                  </td>
                  <td className={`${TD_BASE} h-9 text-right tabular-nums text-red-600`}>
                    {formatarMoeda(row.valorDiminui)}
                  </td>
                  <td className={`${TD_BASE} h-9 text-right tabular-nums font-medium`}>
                    {formatarMoeda(row.valorLiquido)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
