import { describe, expect, it, vi } from 'vitest'
import { AtualizarProdutosPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarProdutosPedidoDeliveryUseCase'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'

describe('AtualizarProdutosPedidoDeliveryUseCase', () => {
  it('quando há add e remove, envia add primeiro e remove só o id que ainda existe', async () => {
    const patchPedidoDelivery = vi.fn().mockResolvedValue(undefined)
    const buscarPedidoDelivery = vi.fn().mockResolvedValue({
      produtosLancados: [{ id: 'lan-1', produtoId: 'cat-1', quantidade: 1 }],
    })
    const repo = { patchPedidoDelivery, buscarPedidoDelivery } as unknown as INovoPedidoReadRepository
    const useCase = new AtualizarProdutosPedidoDeliveryUseCase(repo)

    const add = [{ produtoId: 'p-novo', quantidade: 6, complementos: [] }]
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
    expect(buscarPedidoDelivery).toHaveBeenCalledWith('pedido-1', 'token')
    expect(patchPedidoDelivery.mock.calls[1]).toEqual([
      'pedido-1',
      'token',
      { produtos: { remove } },
    ])
  })

  it('depois do add, não tenta remover id que o backend já substituiu', async () => {
    const patchPedidoDelivery = vi.fn().mockResolvedValue(undefined)
    const buscarPedidoDelivery = vi.fn().mockResolvedValue({
      produtosLancados: [{ id: 'lan-novo', produtoId: 'cat-1', quantidade: 6 }],
    })
    const repo = { patchPedidoDelivery, buscarPedidoDelivery } as unknown as INovoPedidoReadRepository
    const useCase = new AtualizarProdutosPedidoDeliveryUseCase(repo)

    await useCase.execute({
      pedidoId: 'pedido-1',
      token: 'token',
      add: [{ produtoId: 'cat-1', quantidade: 6, complementos: [] }] as never,
      remove: ['lan-1'],
    })

    expect(patchPedidoDelivery).toHaveBeenCalledTimes(1)
    expect(patchPedidoDelivery).toHaveBeenCalledWith('pedido-1', 'token', {
      produtos: { add: [{ produtoId: 'cat-1', quantidade: 6, complementos: [] }] },
    })
  })

  it('se o remove falhar porque o id já saiu, não estoura para o usuário', async () => {
    const patchPedidoDelivery = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new Error('Produtos lançados não encontrados para remoção: lan-1')
      )
    const buscarPedidoDelivery = vi.fn().mockRejectedValue(new Error('rede'))
    const repo = { patchPedidoDelivery, buscarPedidoDelivery } as unknown as INovoPedidoReadRepository
    const useCase = new AtualizarProdutosPedidoDeliveryUseCase(repo)

    await expect(
      useCase.execute({
        pedidoId: 'pedido-1',
        token: 'token',
        add: [{ produtoId: 'cat-1', quantidade: 6, complementos: [] }] as never,
        remove: ['lan-1'],
      })
    ).resolves.toBeUndefined()
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
