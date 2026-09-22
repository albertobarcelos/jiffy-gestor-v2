'use client'

import type {
  RelatorioComplementoImpacto,
  RelatorioComplementoVendidoLinhaDTO,
  RelatorioComplementosVendidosKpisDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda } from '../utils/mvpFormatPt'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

const GRID_BORDER = 'border border-[#d0d7de]'
const TH_BASE = `${GRID_BORDER} bg-[#f3f4f6] px-2 py-1.5 text-xs font-semibold text-primary-text align-middle`
const TD_BASE = `${GRID_BORDER} px-2 py-1.5 align-middle text-sm`

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

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-primary/15 bg-info px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-primary-text">
        {value}
      </p>
    </div>
  )
}

export function MvpComplementosPainel(props: {
  items: RelatorioComplementoVendidoLinhaDTO[]
  kpis: RelatorioComplementosVendidosKpisDTO | undefined
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry?: () => void
}) {
  const { items, kpis, isLoading, isError, errorMessage, onRetry } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {kpis ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <KpiChip label="SKUs" value={String(kpis.skusDistintos)} />
          <KpiChip label="Quantidade" value={String(kpis.quantidadeTotal)} />
          <KpiChip label="Adicionais (+)" value={formatarMoeda(kpis.valorAumenta)} />
          <KpiChip label="Reduções (−)" value={formatarMoeda(kpis.valorDiminui)} />
          <KpiChip label="Líquido" value={formatarMoeda(kpis.valorLiquido)} />
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <JiffyLoading />
        </div>
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16">
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
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[44rem] border-collapse">
            <thead>
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
              {items.length === 0 ? (
                <>
                  <tr className="bg-white">
                    <td
                      colSpan={8}
                      className={`${TD_BASE} h-9 px-3 text-left text-sm text-secondary-text`}
                    >
                      Nenhum complemento neste período
                    </td>
                  </tr>
                  {Array.from({ length: 4 }, (_, idx) => (
                    <tr
                      key={`empty-comp-${idx}`}
                      className={idx % 2 === 0 ? 'bg-[#fafafa]' : 'bg-white'}
                      aria-hidden
                    >
                      {Array.from({ length: 8 }, (_, col) => (
                        <td key={col} className={`${TD_BASE} h-9`}>
                          &nbsp;
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : (
                items.map((row, idx) => (
                  <tr key={row.complementoId} className="bg-white hover:bg-primary/[0.03]">
                    <td className={`${TD_BASE} text-center tabular-nums text-secondary-text`}>
                      {idx + 1}
                    </td>
                    <td className={`${TD_BASE} font-medium text-primary-text`}>{row.nome}</td>
                    <td className={`${TD_BASE} text-secondary-text`}>
                      {row.grupoNome ?? '—'}
                    </td>
                    <td className={`${TD_BASE} text-center`}>
                      <BadgeImpacto impacto={row.impactoPredominante} />
                    </td>
                    <td className={`${TD_BASE} text-right tabular-nums`}>{row.quantidade}</td>
                    <td className={`${TD_BASE} text-right tabular-nums text-accent5`}>
                      {formatarMoeda(row.valorAumenta)}
                    </td>
                    <td className={`${TD_BASE} text-right tabular-nums text-red-600`}>
                      {formatarMoeda(row.valorDiminui)}
                    </td>
                    <td className={`${TD_BASE} text-right tabular-nums font-medium`}>
                      {formatarMoeda(row.valorLiquido)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
