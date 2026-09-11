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

  it('override sem taxa zera o preview mesmo com cobertura', () => {
    const taxa = resolverValorTaxaEntregaPedido({
      pedidoComEntrega: true,
      taxaEntregaCoberturaValor: 8,
      taxaEntregaOverride: 'sem_taxa',
    })
    expect(taxa).toBe(0)
  })

  it('override de catálogo vence a cobertura no wizard', () => {
    const taxa = resolverValorTaxaEntregaPedido({
      pedidoComEntrega: true,
      taxaEntregaCoberturaValor: 8,
      taxaEntregaCatalogoValor: 12,
      taxaEntregaOverride: 'catalogo',
    })
    expect(taxa).toBe(12)
  })

  it('automática no wizard usa a prévia oficial da cotação, não o catálogo', () => {
    const taxa = resolverValorTaxaEntregaPedido({
      pedidoComEntrega: true,
      taxaEntregaCoberturaValor: 8,
      taxaEntregaCatalogoValor: 15,
      taxaEntregaOverride: 'automatica',
    })
    expect(taxa).toBe(8)
  })
})
