import type { ProdutoAddPedidoDelivery } from '@/src/application/delivery/montarDiffProdutosPedidoDelivery'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export type AtualizarProdutosPedidoDeliveryInput = {
  pedidoId: string
  token: string
  add: ProdutoAddPedidoDelivery[]
  remove: string[]
}

/**
 * Atualiza os itens de um pedido delivery (etapas anteriores a `EM_ROTA`) via
 * `PATCH /api/delivery/pedidos/:id` com `{ produtos: { add, remove } }`.
 * Como o backend não possui "update" de item, alterar quantidade/complemento é remove + add.
 */
export class AtualizarProdutosPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(input: AtualizarProdutosPedidoDeliveryInput): Promise<void> {
    const produtos: Record<string, unknown> = {}
    if (input.add.length > 0) produtos.add = input.add
    if (input.remove.length > 0) produtos.remove = input.remove

    if (Object.keys(produtos).length === 0) return

    await this.repo.patchPedidoDelivery(input.pedidoId, input.token, { produtos })
  }
}

export const atualizarProdutosPedidoDeliveryUseCase =
  new AtualizarProdutosPedidoDeliveryUseCase()
