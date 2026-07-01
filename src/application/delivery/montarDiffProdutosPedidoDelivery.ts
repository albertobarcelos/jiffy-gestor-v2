import { mapProdutosPedidoDeliveryPayload } from '@/src/application/mappers/CriarPedidoDeliveryPayloadMapper'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'

export type ProdutoAddPedidoDelivery = ReturnType<typeof mapProdutosPedidoDeliveryPayload>[number]

export interface DiffProdutosPedidoDelivery {
  /** Itens a lançar (novos ou alterados — alteração = remove + add). */
  add: ProdutoAddPedidoDelivery[]
  /** IDs de itens já lançados a remover (soft delete no backend). */
  remove: string[]
  /** Há alguma operação a enviar. */
  alterou: boolean
  /** O resultado final ficaria sem nenhum produto (backend rejeita). */
  resultariaSemProdutos: boolean
  /**
   * Algum item original precisaria ser removido mas não tem `produtoLancadoId`.
   * Sem o id não dá para remover com segurança — a edição não deve ser salva.
   */
  algumOriginalSemId: boolean
}

/**
 * Assinatura comparável de um item: muda quando qualquer campo persistido muda.
 * Usada para detectar alteração (que vira remove + add, pois o backend não tem "update").
 */
function assinaturaProduto(p: ProdutoSelecionado): string {
  const complementos = (p.complementos ?? [])
    .map(c => `${c.id}:${c.grupoId}:${c.quantidade}`)
    .sort()
    .join('|')
  return [
    p.produtoId,
    p.quantidade,
    p.tipoDesconto ?? '',
    p.valorDesconto ?? '',
    p.tipoAcrescimo ?? '',
    p.valorAcrescimo ?? '',
    (p.observacao ?? '').trim(),
    complementos,
  ].join('#')
}

/**
 * Monta o diff `{ add, remove }` entre os produtos originais (carregados da venda) e os
 * produtos editados na UI, para `PATCH /api/delivery/pedidos/:id`.
 *
 * - Item novo (sem `produtoLancadoId`) → `add`.
 * - Item removido na UI → `remove` (id do item lançado).
 * - Item alterado (qtd/complementos/desconto/observação) → `remove` (id original) + `add` (novo).
 * - Item inalterado → nenhuma operação.
 */
export function montarDiffProdutosPedidoDelivery(
  originais: ProdutoSelecionado[],
  atuais: ProdutoSelecionado[]
): DiffProdutosPedidoDelivery {
  const remove: string[] = []
  const adicionar: ProdutoSelecionado[] = []
  let algumOriginalSemId = false

  const originaisPorId = new Map<string, ProdutoSelecionado>()
  for (const original of originais) {
    if (original.produtoLancadoId) {
      originaisPorId.set(original.produtoLancadoId, original)
    }
  }

  const idsOriginaisVistos = new Set<string>()

  for (const atual of atuais) {
    const id = atual.produtoLancadoId
    const original = id ? originaisPorId.get(id) : undefined

    if (id && original) {
      idsOriginaisVistos.add(id)
      if (assinaturaProduto(original) !== assinaturaProduto(atual)) {
        // Alterado: remove o original e relança com os novos valores.
        remove.push(id)
        adicionar.push(atual)
      }
      // Inalterado: nenhuma operação.
    } else {
      // Item novo (ou perdeu o vínculo com o original): apenas lança.
      adicionar.push(atual)
    }
  }

  for (const original of originais) {
    if (!original.produtoLancadoId) {
      algumOriginalSemId = true
      continue
    }
    if (!idsOriginaisVistos.has(original.produtoLancadoId)) {
      remove.push(original.produtoLancadoId)
    }
  }

  const add = mapProdutosPedidoDeliveryPayload(adicionar)

  return {
    add,
    remove,
    alterou: add.length > 0 || remove.length > 0,
    resultariaSemProdutos: atuais.length === 0,
    algumOriginalSemId,
  }
}
