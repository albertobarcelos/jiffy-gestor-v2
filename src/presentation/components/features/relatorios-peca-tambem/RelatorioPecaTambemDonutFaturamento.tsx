'use client'

import { formatarMoedaBrl } from '@/src/presentation/components/features/relatorios/relatorioEntregasFormat'
import { RelatorioPecaTambemDonutComparativo } from '@/src/presentation/components/features/relatorios-peca-tambem/RelatorioPecaTambemDonutComparativo'
import { colors } from '@/src/shared/theme/colors'

type RelatorioPecaTambemDonutFaturamentoProps = {
  faturamentoPecaTambem: number
  faturamentoTotalPeriodo: number
  embutidoNoModal?: boolean
}

/** Donut: participação do Peça Também no faturamento de itens de delivery do período. */
export function RelatorioPecaTambemDonutFaturamento({
  faturamentoPecaTambem,
  faturamentoTotalPeriodo,
  embutidoNoModal = false,
}: RelatorioPecaTambemDonutFaturamentoProps) {
  return (
    <RelatorioPecaTambemDonutComparativo
      valorPrincipal={faturamentoPecaTambem}
      valorTotal={faturamentoTotalPeriodo}
      labelPrincipal="Peça Também"
      labelDemais="Demais itens"
      subtitulo="Peça Também vs demais itens do delivery público no período"
      corPrincipal={colors.primary}
      corDemais="#E5E7EB"
      formatarValor={formatarMoedaBrl}
      embutidoNoModal={embutidoNoModal}
    />
  )
}
