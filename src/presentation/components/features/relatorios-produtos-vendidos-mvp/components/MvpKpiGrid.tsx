'use client'

import type { ReactNode } from 'react'
import {
  MdAttachMoney,
  MdInventory2,
  MdReceiptLong,
  MdTrendingUp,
  MdWorkspacePremium,
} from 'react-icons/md'
import type { RelatorioProdutosVendidosMvpKpisDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda, formatarVariacaoPct } from '../utils/mvpFormatPt'

function badgeVariacao(pct: number | null | undefined): { badge: string; badgePositivo: boolean } {
  if (pct == null || !Number.isFinite(pct)) {
    return { badge: '—', badgePositivo: true }
  }
  const down = pct < -0.05
  return {
    badge: formatarVariacaoPct(pct),
    badgePositivo: !down,
  }
}

function MvpMetricCard({
  tituloBase,
  icon,
  valor,
  badge,
  rodape,
  badgePositivo = true,
  valorGrande = true,
}: {
  tituloBase: string
  icon: ReactNode
  valor: string
  badge?: string
  rodape: string
  badgePositivo?: boolean
  /** Nomes longos de produto usam tipografia um pouco menor */
  valorGrande?: boolean
}) {
  return (
    <div className="min-w-[260px] flex-1 rounded-xl border border-gray-200 bg-white p-2">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100/90 text-primary md:h-8 md:w-8">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary-text">{tituloBase}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`font-semibold tracking-tight text-primary-text ${
                valorGrande
                  ? 'text-sm md:text-base'
                  : 'line-clamp-2 text-sm md:text-base'
              }`}
            >
              {valor}
            </span>
            {badge != null && badge !== '' ? (
              <span
                className={`shrink-0 rounded-md px-1 py-0.5 text-xs font-medium text-white ${
                  badgePositivo ? 'bg-[#00B074]' : 'bg-[#D92D20]'
                }`}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-snug text-[#006699]">{rodape}</p>
        </div>
      </div>
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="min-w-[280px] flex-1 animate-pulse rounded-2xl border border-gray-200 bg-white p-2">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 shrink-0 rounded-full bg-violet-100/90 md:h-14 md:w-14" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
          <div className="h-3 w-40 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  )
}

const iconClass = 'text-[#1E3A8A]'

export function MvpKpiGrid(props: {
  kpis: RelatorioProdutosVendidosMvpKpisDTO | undefined
  isLoading: boolean
  /** Deltas do período anterior ainda carregando (2ª fase). */
  comparativoPendente?: boolean
}) {
  const { kpis, isLoading, comparativoPendente = false } = props

  if (isLoading || !kpis) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </>
    )
  }

  const badgePlaceholder = comparativoPendente ? '…' : undefined
  const fatBadge = badgeVariacao(comparativoPendente ? null : kpis.variacaoPercentualFat)
  const qtdBadge = badgeVariacao(comparativoPendente ? null : kpis.variacaoPercentualQuantidade)
  const ticketBadge = badgeVariacao(comparativoPendente ? null : kpis.variacaoPercentualTicketMedio)
  const liderBadge = badgeVariacao(
    comparativoPendente ? null : kpis.produtoLiderPercentualVsPeriodoAnterior
  )

  const rodapeFat = comparativoPendente
    ? 'Atualizando período anterior…'
    : kpis.faturamentoAnterior != null
      ? `Período anterior: ${formatarMoeda(kpis.faturamentoAnterior)}`
      : 'Sem base no período anterior'

  const rodapeQtd = comparativoPendente
    ? 'Atualizando período anterior…'
    : kpis.quantidadeAnterior != null
      ? `Período anterior: ${kpis.quantidadeAnterior.toLocaleString('pt-BR')} un.`
      : 'Sem base no período anterior'

  const rodapeTicket = comparativoPendente
    ? 'Atualizando período anterior…'
    : kpis.ticketMedioPorItemPeriodoAnterior != null
      ? `Período anterior: ${formatarMoeda(kpis.ticketMedioPorItemPeriodoAnterior)}`
      : 'Sem base no período anterior'

  const growthNome = kpis.produtoComMaiorCrescimentoNome
  const growthPct = kpis.produtoComMaiorCrescimentoPct
  const growthBadge = badgeVariacao(growthPct)

  return (
    <>
      <MvpMetricCard
        tituloBase="Faturamento período"
        icon={<MdAttachMoney className={iconClass} size={22} aria-hidden />}
        valor={formatarMoeda(kpis.faturamentoAtual)}
        badge={badgePlaceholder ?? fatBadge.badge}
        rodape={rodapeFat}
        badgePositivo={fatBadge.badgePositivo}
      />
      <MvpMetricCard
        tituloBase="Unidades vendidas"
        icon={<MdInventory2 className={iconClass} size={22} aria-hidden />}
        valor={kpis.quantidadeVendidaAtual.toLocaleString('pt-BR')}
        badge={badgePlaceholder ?? qtdBadge.badge}
        rodape={rodapeQtd}
        badgePositivo={qtdBadge.badgePositivo}
      />
      <MvpMetricCard
        tituloBase="Ticket médio / unidade"
        icon={<MdReceiptLong className={iconClass} size={22} aria-hidden />}
        valor={formatarMoeda(kpis.ticketMedioPorItemNoPeriodo)}
        badge={badgePlaceholder ?? ticketBadge.badge}
        rodape={rodapeTicket}
        badgePositivo={ticketBadge.badgePositivo}
      />
      <MvpMetricCard
        tituloBase="Líder em quantidade"
        icon={<MdWorkspacePremium className={iconClass} size={22} aria-hidden />}
        valor={kpis.produtoLiderNomeQuantidade}
        //badge={liderBadge.badge}
        rodape={`${kpis.produtoLiderQuantidadeUnidades.toLocaleString('pt-BR')} un. no período`}
        badgePositivo={liderBadge.badgePositivo}
        valorGrande={false}
      />
      {growthNome != null && growthPct != null ? (
        <MvpMetricCard
          tituloBase="Maior crescimento"
          icon={<MdTrendingUp className={iconClass} size={22} aria-hidden />}
          valor={growthNome}
          badge={growthBadge.badge}
          rodape="vs. período anterior (unidades)"
          badgePositivo={growthBadge.badgePositivo}
          valorGrande={false}
        />
      ) : null}
    </>
  )
}
