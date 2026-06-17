import { describe, expect, it, vi } from 'vitest'
import { CriarPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/CriarPedidoDeliveryUseCase'
import type { CriarPedidoDeliveryInputDTO } from '@/src/application/dto/CriarPedidoDeliveryDTO'
import { atualizarCobrancasPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarCobrancasPedidoDeliveryUseCase'

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
    telefoneCliente: '11999999999',
    ...overrides,
  }
}

describe('CriarPedidoDeliveryUseCase', () => {
  it('registra cobranças via PATCH após criar pedido já pago', async () => {
    const executeSpy = vi
      .spyOn(atualizarCobrancasPedidoDeliveryUseCase, 'execute')
      .mockResolvedValue(true)

    const mutate = vi.fn().mockResolvedValue({ id: 'pedido-abc' })
    const useCase = new CriarPedidoDeliveryUseCase()

    await useCase.execute(baseInput(), mutate, 'token-test')

    expect(mutate).toHaveBeenCalledOnce()
    const postPayload = mutate.mock.calls[0][0] as { cobrancas?: unknown }
    expect(postPayload.cobrancas).toBeUndefined()

    expect(executeSpy).toHaveBeenCalledWith(
      'pedido-abc',
      'token-test',
      [{ meioPagamentoId: 'mp-1', valor: 24 }],
      'ja_pago'
    )

    executeSpy.restore()
  })
})
