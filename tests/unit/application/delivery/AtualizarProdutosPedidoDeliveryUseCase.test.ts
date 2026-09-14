import { describe, expect, it, vi } from 'vitest'
import { AtualizarProdutosPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarProdutosPedidoDeliveryUseCase'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'

describe('AtualizarProdutosPedidoDeliveryUseCase', () => {
  it('quando há add e remove, envia add primeiro e remove depois', async () => {
    const patchPedidoDelivery = vi.fn().mockResolvedValue(undefined)
    const repo = { patchPedidoDelivery } as unknown as INovoPedidoReadRepository
    const useCase = new AtualizarProdutosPedidoDeliveryUseCase(repo)

    const add = [{ produtoId: 'p-novo', quantidade: 1, complementos: [] }]
    const remove = ['lan-1']

    await useCase.execute({
      pedidoId: 'pedido-1',
      token: 'token',
      add: add as never,
      remove,
    })

    expect(patchPedidoDelivery).toHaveBeenCalledTimes(2)
    expect(patchPedidoDelivery.mock.calls[0]).toEqual([
      'pedido-1',
      'token',
      { produtos: { add } },
    ])
    expect(patchPedidoDelivery.mock.calls[1]).toEqual([
      'pedido-1',
      'token',
      { produtos: { remove } },
    ])
  })

  it('quando só há add, envia um único PATCH', async () => {
    const patchPedidoDelivery = vi.fn().mockResolvedValue(undefined)
    const repo = { patchPedidoDelivery } as unknown as INovoPedidoReadRepository
    const useCase = new AtualizarProdutosPedidoDeliveryUseCase(repo)

    const add = [{ produtoId: 'p-novo', quantidade: 1, complementos: [] }]

    await useCase.execute({
      pedidoId: 'pedido-1',
      token: 'token',
      add: add as never,
      remove: [],
    })

    expect(patchPedidoDelivery).toHaveBeenCalledTimes(1)
    expect(patchPedidoDelivery).toHaveBeenCalledWith('pedido-1', 'token', {
      produtos: { add },
    })
  })

  it('quando só há remove, envia um único PATCH', async () => {
    const patchPedidoDelivery = vi.fn().mockResolvedValue(undefined)
    const repo = { patchPedidoDelivery } as unknown as INovoPedidoReadRepository
    const useCase = new AtualizarProdutosPedidoDeliveryUseCase(repo)

    await useCase.execute({
      pedidoId: 'pedido-1',
      token: 'token',
      add: [],
      remove: ['lan-1'],
    })

    expect(patchPedidoDelivery).toHaveBeenCalledTimes(1)
    expect(patchPedidoDelivery).toHaveBeenCalledWith('pedido-1', 'token', {
      produtos: { remove: ['lan-1'] },
    })
  })
})
