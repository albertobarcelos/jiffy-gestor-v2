'use client'

import {
  MdAttachMoney,
  MdCategory,
  MdInventory2,
  MdRemoveCircleOutline,
  MdTrendingUp,
  MdWorkspacePremium,
} from 'react-icons/md'
import type { RelatorioComplementosVendidosKpisDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda } from '../utils/mvpFormatPt'
import { MvpMetricCard } from './MvpKpiGrid'

const iconClass = 'text-[#1E3A8A]'
const RODAPE_FILTROS = 'Com os filtros aplicados no período'

/** Mesmo layout de cards da aba Produtos — métricas do bloco de complementos. */
export function MvpComplementosKpiGrid(props: {
  kpis: RelatorioComplementosVendidosKpisDTO | undefined
}) {
  const { kpis } = props
  if (!kpis) return null

  const liderNome = kpis.complementoLiderNome?.trim() || '—'

  return (
    <>
      <MvpMetricCard
        tituloBase="Líquido período"
        icon={<MdAttachMoney className={iconClass} size={22} aria-hidden />}
        valor={formatarMoeda(kpis.valorLiquido)}
        rodape={RODAPE_FILTROS}
      />
      <MvpMetricCard
        tituloBase="Quantidade"
        icon={<MdInventory2 className={iconClass} size={22} aria-hidden />}
        valor={kpis.quantidadeTotal.toLocaleString('pt-BR')}
        rodape={RODAPE_FILTROS}
      />
      <MvpMetricCard
        tituloBase="Complementos distintos"
        icon={<MdCategory className={iconClass} size={22} aria-hidden />}
        valor={kpis.skusDistintos.toLocaleString('pt-BR')}
        rodape={RODAPE_FILTROS}
      />
      <MvpMetricCard
        tituloBase="Adicionais (+)"
        icon={<MdTrendingUp className={iconClass} size={22} aria-hidden />}
        valor={formatarMoeda(kpis.valorAumenta)}
        rodape={
          kpis.valorDiminui > 0
            ? `Reduções (−): ${formatarMoeda(kpis.valorDiminui)}`
            : RODAPE_FILTROS
        }
      />
      <MvpMetricCard
        tituloBase="Líder em quantidade"
        icon={
          kpis.complementoLiderNome ? (
            <MdWorkspacePremium className={iconClass} size={22} aria-hidden />
          ) : (
            <MdRemoveCircleOutline className={iconClass} size={22} aria-hidden />
          )
        }
        valor={liderNome}
        rodape={`${kpis.complementoLiderQuantidade.toLocaleString('pt-BR')} un. no período`}
        valorGrande={false}
      />
    </>
  )
}
