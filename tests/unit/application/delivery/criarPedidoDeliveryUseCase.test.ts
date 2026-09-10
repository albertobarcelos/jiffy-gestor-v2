import { describe, expect, it, vi } from 'vitest'
import { CriarPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/CriarPedidoDeliveryUseCase'
import type { CriarPedidoDeliveryInputDTO } from '@/src/application/dto/CriarPedidoDeliveryDTO'
import { atualizarCobrancasPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarCobrancasPedidoDeliveryUseCase'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { TAXA_ENTREGA_SEM_TAXA_ID } from '@/src/shared/constants/taxaEntregaPedido'

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

function repoMock(overrides: Partial<INovoPedidoReadRepository> = {}): INovoPedidoReadRepository {
  return {
    listarEntregadores: vi.fn(),
    listarEntregadoresDelivery: vi.fn(),
    listarGruposDoMenu: vi.fn(),
    listarProdutosDoGrupo: vi.fn(),
    listarProdutosCatalogoPagina: vi.fn(),
    listarGrupoIdsComProdutosAtivos: vi.fn(),
    buscarProdutoPorId: vi.fn(),
    buscarProdutosPorNome: vi.fn(),
    buscarClienteJson: vi.fn(),
    atualizarPagamentosVendaGestor: vi.fn(),
    buscarPedidoDelivery: vi.fn().mockResolvedValue({
      taxasLancadas: [{ taxaId: 'tx-auto', tipo: 'entrega', valor: 8 }],
      taxaEntregaId: 'tx-auto',
      cobrancas: [],
    }),
    patchPedidoDelivery: vi.fn().mockResolvedValue(undefined),
    transicionarStatusPedidoDelivery: vi.fn().mockResolvedValue(undefined),
    emitirNotaPedidoDelivery: vi.fn(),
    buscarAuthMe: vi.fn(),
    buscarUsuarioGestor: vi.fn(),
    ...overrides,
  } as INovoPedidoReadRepository
}

describe('CriarPedidoDeliveryUseCase', () => {
  it('registra cobran?as via PATCH ap?s criar pedido j? pago', async () => {
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

    executeSpy.mockRestore()
  })

  it('omite cobran?a no POST, ajusta taxa e lan?a cobran?a no mesmo PATCH, e cancela se o PATCH falhar', async () => {
    const patchPedidoDelivery = vi.fn().mockRejectedValue(new Error('PATCH taxas falhou'))
    const transicionarStatusPedidoDelivery = vi.fn().mockResolvedValue(undefined)
    const repo = repoMock({ patchPedidoDelivery, transicionarStatusPedidoDelivery })
    const cobrancas = { execute: vi.fn() }
    const mutate = vi.fn().mockResolvedValue({ id: 'pedido-xyz' })
    const useCase = new CriarPedidoDeliveryUseCase(cobrancas as never, repo)

    await expect(
      useCase.execute(
        baseInput({
          pedidoComEntrega: true,
          taxaEntregaId: TAXA_ENTREGA_SEM_TAXA_ID,
          entregaComCobrancaPeloEntregador: true,
          pagamentos: [{ meioPagamentoId: 'mp-1', valor: 40 }],
        }),
        mutate,
        'token-test'
      )
    ).rejects.toThrow(/n?o foi lan?ado/i)

    const postPayload = mutate.mock.calls[0][0] as { cobrancas?: unknown }
    expect(postPayload.cobrancas).toBeUndefined()
    expect(cobrancas.execute).not.toHaveBeenCalled()
    expect(transicionarStatusPedidoDelivery).toHaveBeenCalledWith(
      'pedido-xyz',
      'token-test',
      expect.objectContaining({ toStatus: 'CANCELADO' })
    )
  })

  it('n?o chama PATCH de cobran?a avulso quando o override j? lan?a taxa e cobran?a juntos', async () => {
    const patchPedidoDelivery = vi.fn().mockResolvedValue(undefined)
    const repo = repoMock({
      patchPedidoDelivery,
      buscarPedidoDelivery: vi
        .fn()
        .mockResolvedValueOnce({
          taxasLancadas: [{ taxaId: 'tx-auto', tipo: 'entrega', valor: 8 }],
          taxaEntregaId: 'tx-auto',
          cobrancas: [],
        })
        .mockResolvedValue({ cobrancas: [] }),
    })
    const cobrancas = { execute: vi.fn() }
    const mutate = vi.fn().mockResolvedValue({ id: 'pedido-ok' })
    const useCase = new CriarPedidoDeliveryUseCase(cobrancas as never, repo)

    await useCase.execute(
      baseInput({
        pedidoComEntrega: true,
        taxaEntregaId: TAXA_ENTREGA_SEM_TAXA_ID,
        entregaComCobrancaPeloEntregador: true,
        pagamentos: [{ meioPagamentoId: 'mp-1', valor: 40 }],
      }),
      mutate,
      'token-test'
    )

    expect(cobrancas.execute).not.toHaveBeenCalled()
    expect(patchPedidoDelivery).toHaveBeenCalledWith(
      'pedido-ok',
      'token-test',
      expect.objectContaining({
        taxas: { remove: ['tx-auto'] },
        cobrancas: {
          add: [
            expect.objectContaining({
              meioPagamentoId: 'mp-1',
              valor: 40,
              momentoCobranca: 'na_entrega',
            }),
          ],
        },
      })
    )
  })
})
