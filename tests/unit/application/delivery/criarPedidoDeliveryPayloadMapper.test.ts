import { describe, expect, it } from 'vitest'
import { buildCriarPedidoDeliveryPayload } from '@/src/application/mappers/CriarPedidoDeliveryPayloadMapper'
import type { CriarPedidoDeliveryInputDTO } from '@/src/application/dto/CriarPedidoDeliveryDTO'

function baseInput(
  overrides: Partial<CriarPedidoDeliveryInputDTO> = {}
): CriarPedidoDeliveryInputDTO {
  return {
    tipoInicioPedido: 'entrega',
    origem: 'GESTOR',
    status: 'ABERTA',
    produtos: [
      {
        produtoId: 'prod-1',
        quantidade: 1,
        valorUnitario: 24,
        valorDesconto: null,
        valorAcrescimo: null,
        tipoDesconto: null,
        tipoAcrescimo: null,
        complementos: [],
      },
    ],
    pagamentos: [{ meioPagamentoId: 'mp-1', valor: 24 }],
    totalProdutos: 24,
    totalPagamentos: 24,
    totalPagamentosLancados: 24,
    tipoAtendimentoDelivery: 'entrega',
    tempoPrevistoMinutos: 30,
    pedidoComEntrega: false,
    valorTaxaEntrega: 0,
    entregaComCobrancaPeloEntregador: false,
    valorRecebido: '',
    trocoLancamento: 0,
    statusPagamentoPedido: 'pago',
    valorAPagar: 0,
    meiosPagamento: [],
    nomesMeiosPagamentoPedido: {},
    ...overrides,
  }
}

describe('CriarPedidoDeliveryPayloadMapper', () => {
  it('confirma pagamento antecipado quando já foi pago', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({ entregaComCobrancaPeloEntregador: false })
    )

    expect(payload.cobrancas).toEqual([
      {
        meioPagamentoId: 'mp-1',
        valor: 24,
        momentoCobranca: 'antecipado',
        pagamentoEfetivado: { confirmar: true },
      },
    ])
  })

  it('não confirma cobrança na entrega quando entregador vai cobrar', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({ entregaComCobrancaPeloEntregador: true })
    )

    expect(payload.cobrancas).toEqual([
      {
        meioPagamentoId: 'mp-1',
        valor: 24,
        momentoCobranca: 'na_entrega',
      },
    ])
  })

  it('inclui taxa de entrega no payload quando pedido com entrega', () => {
    const payload = buildCriarPedidoDeliveryPayload(
      baseInput({
        pedidoComEntrega: true,
        taxaEntregaSelecionada: { getId: () => 'taxa-entrega-1' },
        valorTaxaEntrega: 5,
        totalProdutos: 29,
        pagamentos: [{ meioPagamentoId: 'mp-1', valor: 29 }],
        totalPagamentos: 29,
        totalPagamentosLancados: 29,
      })
    )

    expect(payload.taxas).toEqual([{ taxaId: 'taxa-entrega-1', quantidade: 1 }])
    expect(payload.cobrancas?.[0]?.valor).toBe(29)
  })
})
