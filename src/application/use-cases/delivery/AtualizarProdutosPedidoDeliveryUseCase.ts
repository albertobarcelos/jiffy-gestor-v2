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
 *
 * Workaround: quando há add e remove juntos, envia **add primeiro** e **remove depois**.
 * O backend aplica remove antes do add no mesmo PATCH e valida "pelo menos um produto"
 * após cada rebuild — zerar os itens no remove impede o add de rodar.
 */
export class AtualizarProdutosPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(input: AtualizarProdutosPedidoDeliveryInput): Promise<void> {
    const temAdd = input.add.length > 0
    const temRemove = input.remove.length > 0

    if (!temAdd && !temRemove) return

    if (temAdd && temRemove) {
      await this.repo.patchPedidoDelivery(input.pedidoId, input.token, {
        produtos: { add: input.add },
      })
      await this.repo.patchPedidoDelivery(input.pedidoId, input.token, {
        produtos: { remove: input.remove },
      })
      return
    }

    const produtos: Record<string, unknown> = {}
    if (temAdd) produtos.add = input.add
    if (temRemove) produtos.remove = input.remove

    await this.repo.patchPedidoDelivery(input.pedidoId, input.token, { produtos })
  }
}

export const atualizarProdutosPedidoDeliveryUseCase =
  new AtualizarProdutosPedidoDeliveryUseCase()
