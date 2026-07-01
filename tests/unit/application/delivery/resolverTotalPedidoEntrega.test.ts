import { describe, expect, it } from 'vitest'
import {
  resolverTotalPedidoComTaxaEntrega,
  resolverValorTaxaEntregaPedido,
} from '@/src/application/mappers/resolverTotalPedidoEntrega'

describe('resolverTotalPedidoEntrega', () => {
  it('soma taxa quando valorFinal da API não inclui taxa de entrega', () => {
    const total = resolverTotalPedidoComTaxaEntrega({
      subtotalItens: 109.3,
      taxaEntrega: 5,
      valorFinalApi: 109.3,
    })
    expect(total).toBe(114.3)
  })

  it('usa resumo financeiro quando disponível', () => {
    const total = resolverTotalPedidoComTaxaEntrega({
      subtotalItens: 100,
      taxaEntrega: 5,
      valorFinalApi: 100,
      resumoFinanceiroDetalhes: {
        totalItensLancados: 100,
        totalTaxasEntrega: 5,
        totalItensCancelados: 0,
        totalDosItens: 105,
        totalDescontosConta: 0,
        totalAcrescimosConta: 0,
      },
    })
    expect(total).toBe(105)
  })

  it('resolve taxa do detalhe de entrega ao carregar pedido existente', () => {
    const taxa = resolverValorTaxaEntregaPedido({
      pedidoComEntrega: true,
      taxaEntregaValor: 5,
      resumoFinanceiroDetalhes: null,
      taxaEntregaCatalogoValor: null,
    })
    expect(taxa).toBe(5)
  })
})
