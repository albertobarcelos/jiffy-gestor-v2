'use client'

import type { RelatorioProdutosVendidosMvpKpisDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { MVP_INSIGHT_SEM_RANKING_BASE } from '../mocks/leiturasFallback'

export function MvpInsights(props: {
  kpis: RelatorioProdutosVendidosMvpKpisDTO | undefined
  totalFiltrado: number
  insightsHeuristicos?: boolean
  comparativoOmitido?: boolean
}) {
  const { kpis, totalFiltrado, insightsHeuristicos, comparativoOmitido } = props

  if (!kpis) return null

  const frases: string[] = []
  const fatVar = kpis.variacaoPercentualFat
  const qtyVar = kpis.variacaoPercentualQuantidade

  if (totalFiltrado > 8) {
    frases.push(`O relatório já filtra ${totalFiltrado} SKUs diferentes — vale combinar períodos curtos com grupos estratégicos.`)
  } else if (totalFiltrado > 0) {
    frases.push('Mix mais enxuto facilita ler curva ABC e tendências rápidas no PDV.')
  }

  if (fatVar != null && qtyVar != null) {
    const fatUp = fatVar > 1
    const qtyDown = qtyVar < -1
    if (fatUp && qtyDown) {
      frases.push('Faturamento subiu mesmo com menos unidades: ticket ou mix premium pode estar puxando o resultado.')
    } else if (fatVar < -1 && qtyVar > 1) {
      frases.push('Unidades aumentaram mais que o faturamento — há chance de maior participação em itens de menor valor unitário.')
    }
  }

  if (insightsHeuristicos) {
    frases.push(
      'Textos são heurísticas locais (sem modelo de IA). Use-os como primeira leitura e valide causas nos lançamentos reais.'
    )
  }

  if (!frases.length && comparativoOmitido) {
    frases.push(MVP_INSIGHT_SEM_RANKING_BASE)
  }

  if (!frases.length) return null

  return (
    <aside className="rounded-xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-relaxed text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
        Leituras rápidas
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {frases.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </aside>
  )
}
