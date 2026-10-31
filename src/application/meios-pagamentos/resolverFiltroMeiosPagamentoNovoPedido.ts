import type { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import type { TipoAtendimentoDelivery } from '@/src/domain/types/vendaDetalhe'

/**
 * Pedido manual sem tipo delivery (ex.: balcão): mostra o meio se entrega
 * OU retirada estiver ligada. As duas desligadas ficam só no POS.
 */
export function meioVisivelNoPedidoManual(meio: MeioPagamento): boolean {
  return meio.isDelivery()
}

/**
 * Pedido delivery no Gestor: só o canal do tipo do pedido (igual ao checkout público).
 * Sem tipo: mantém a união entrega ∪ retirada.
 */
export function meioVisivelParaTipoPedidoManual(
  meio: MeioPagamento,
  tipoAtendimento?: TipoAtendimentoDelivery | null
): boolean {
  if (tipoAtendimento === 'entrega' || tipoAtendimento === 'retirada') {
    return meio.disponivelParaTipoEntrega(tipoAtendimento)
  }
  return meioVisivelNoPedidoManual(meio)
}

export function coletarMeiosDasPaginas(
  pages?: Array<{ meiosPagamento?: MeioPagamento[] }>
): MeioPagamento[] {
  return (pages ?? []).flatMap(page => page.meiosPagamento ?? [])
}

/** União por id, respeitando o tipo do pedido quando informado. */
export function unirMeiosPedidoManual(
  listas: MeioPagamento[][],
  tipoAtendimento?: TipoAtendimentoDelivery | null
): MeioPagamento[] {
  const porId = new Map<string, MeioPagamento>()
  for (const lista of listas) {
    for (const meio of lista) {
      if (!meioVisivelParaTipoPedidoManual(meio, tipoAtendimento)) continue
      porId.set(meio.getId(), meio)
    }
  }
  return [...porId.values()]
}
