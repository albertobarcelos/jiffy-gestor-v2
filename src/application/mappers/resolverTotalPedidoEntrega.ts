import type { ResumoFinanceiroDetalhes } from '@/src/domain/types/vendaDetalhe'

/** Subtotal de produtos (sem taxa de entrega). */
export function resolverSubtotalItensPedido(
  subtotalCalculadoProdutos: number,
  resumoFinanceiroDetalhes?: ResumoFinanceiroDetalhes | null
): number {
  if (resumoFinanceiroDetalhes) {
    return (
      resumoFinanceiroDetalhes.totalItensLancados -
      resumoFinanceiroDetalhes.totalItensCancelados
    )
  }
  return subtotalCalculadoProdutos
}

export function resolverValorTaxaEntregaPedido(args: {
  pedidoComEntrega: boolean
  taxaEntregaValor?: number | null
  resumoFinanceiroDetalhes?: ResumoFinanceiroDetalhes | null
  taxaEntregaCatalogoValor?: number | null
}): number {
  if (!args.pedidoComEntrega) return 0

  const fromDetalhe = args.taxaEntregaValor
  if (fromDetalhe != null && fromDetalhe > 0) return Number(fromDetalhe)

  const fromResumo = args.resumoFinanceiroDetalhes?.totalTaxasEntrega
  if (fromResumo != null && fromResumo > 0) return fromResumo

  const fromCatalogo = args.taxaEntregaCatalogoValor
  if (fromCatalogo != null && fromCatalogo > 0) return fromCatalogo

  return 0
}

/**
 * Total do pedido com taxa de entrega.
 * Prioriza resumo financeiro (A + B − C); se `valorFinal` da API não inclui taxa, soma explicitamente.
 */
export function resolverTotalPedidoComTaxaEntrega(args: {
  subtotalItens: number
  taxaEntrega: number
  valorFinalApi?: number | null
  resumoFinanceiroDetalhes?: ResumoFinanceiroDetalhes | null
}): number {
  const resumoTotal = args.resumoFinanceiroDetalhes?.totalDosItens
  if (resumoTotal != null && Number.isFinite(resumoTotal) && resumoTotal > 0) {
    return resumoTotal
  }

  const comTaxa = Math.round((args.subtotalItens + args.taxaEntrega) * 100) / 100
  const vf = args.valorFinalApi

  if (vf != null && Number.isFinite(vf)) {
    if (args.taxaEntrega > 0 && vf < comTaxa - 0.009) {
      return comTaxa
    }
    return vf
  }

  return comTaxa
}
