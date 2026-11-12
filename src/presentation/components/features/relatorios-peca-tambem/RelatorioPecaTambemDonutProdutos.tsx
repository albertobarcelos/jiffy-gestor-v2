'use client'

import { formatarInteiroBr } from '@/src/presentation/components/features/relatorios/relatorioEntregasFormat'
import { RelatorioPecaTambemDonutComparativo } from '@/src/presentation/components/features/relatorios-peca-tambem/RelatorioPecaTambemDonutComparativo'
import { colors, getColorWithOpacity } from '@/src/shared/theme/colors'

type RelatorioPecaTambemDonutProdutosProps = {
  produtosPecaTambem: number
  produtosTotalPeriodo: number
  embutidoNoModal?: boolean
}

/** Donut: participação do Peça Também na quantidade de produtos vendidos no período. */
export function RelatorioPecaTambemDonutProdutos({
  produtosPecaTambem,
  produtosTotalPeriodo,
  embutidoNoModal = false,
}: RelatorioPecaTambemDonutProdutosProps) {
  return (
    <RelatorioPecaTambemDonutComparativo
      valorPrincipal={produtosPecaTambem}
      valorTotal={produtosTotalPeriodo}
      labelPrincipal="Peça Também"
      labelDemais="Demais itens"
      subtitulo="Peça Também vs demais produtos do delivery público no período"
      corPrincipal={getColorWithOpacity('secondary', 0.5)}
      corDemais={colors.secondary}
      formatarValor={formatarInteiroBr}
      embutidoNoModal={embutidoNoModal}
    />
  )
}
