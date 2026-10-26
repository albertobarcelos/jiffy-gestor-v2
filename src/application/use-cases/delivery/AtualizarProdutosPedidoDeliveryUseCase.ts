import { isErroProdutosLancadosNaoEncontrados } from '@/src/application/delivery/erroProdutosLancadosNaoEncontrados'
import { filtrarIdsLancadosPresentes } from '@/src/application/delivery/idsProdutosLancadosAtivosPedido'
import type { ProdutoAddPedidoDelivery } from '@/src/application/delivery/montarDiffProdutosPedidoDelivery'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'

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
 *
 * Depois do add, só remove IDs que ainda existem no GET. Se o backend já substituiu a
 * linha no add, o remove do id antigo estoura "não encontrados para remoção" e um
 * segundo save relança o produto (6 vira 12).
 */
export class AtualizarProdutosPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  async execute(input: AtualizarProdutosPedidoDeliveryInput): Promise<void> {
    const temAdd = input.add.length > 0
    const temRemove = input.remove.length > 0

    if (!temAdd && !temRemove) return

    if (temAdd && temRemove) {
      await this.repo.patchPedidoDelivery(input.pedidoId, input.token, {
        produtos: { add: input.add },
      })
      const idsAindaPresentes = await this.idsRemoverAindaPresentes(input)
      await this.removerIgnorandoJaAusentes(input.pedidoId, input.token, idsAindaPresentes)
      return
    }

    if (temRemove) {
      await this.removerIgnorandoJaAusentes(input.pedidoId, input.token, input.remove)
      return
    }

    await this.repo.patchPedidoDelivery(input.pedidoId, input.token, {
      produtos: { add: input.add },
    })
  }

  private async idsRemoverAindaPresentes(
    input: AtualizarProdutosPedidoDeliveryInput
  ): Promise<string[]> {
    try {
      const pedido = await this.repo.buscarPedidoDelivery(input.pedidoId, input.token)
      return filtrarIdsLancadosPresentes(input.remove, pedido)
    } catch {
      return input.remove
    }
  }

  private async removerIgnorandoJaAusentes(
    pedidoId: string,
    token: string,
    remove: string[]
  ): Promise<void> {
    if (remove.length === 0) return
    try {
      await this.repo.patchPedidoDelivery(pedidoId, token, { produtos: { remove } })
    } catch (error) {
      if (isErroProdutosLancadosNaoEncontrados(error)) return
      throw error
    }
  }
}
