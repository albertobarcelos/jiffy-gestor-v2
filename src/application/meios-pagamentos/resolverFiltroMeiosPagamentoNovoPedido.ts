import type { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import type { TipoAtendimentoDelivery } from '@/src/domain/types/vendaDetalhe'

/**
 * Pedido balcão no Gestor: coluna Terminal (`ativo` / POS Ativo).
 * Entrega e retirada não entram nesse critério.
 */
export function meioVisivelNoPedidoBalcao(meio: MeioPagamento): boolean {
  return meio.isAtivo()
}

/**
 * Pedido delivery no Gestor: só o canal do tipo (igual ao checkout público).
 * Sem tipo (balcão): só meios com Terminal ativo.
 */
export function meioVisivelParaTipoPedidoManual(
  meio: MeioPagamento,
  tipoAtendimento?: TipoAtendimentoDelivery | null
): boolean {
  if (tipoAtendimento === 'entrega' || tipoAtendimento === 'retirada') {
    return meio.disponivelParaTipoEntrega(tipoAtendimento)
  }
  return meioVisivelNoPedidoBalcao(meio)
}

export function coletarMeiosDasPaginas(
  pages?: Array<{ meiosPagamento?: MeioPagamento[] }>
): MeioPagamento[] {
  return (pages ?? []).flatMap(page => page.meiosPagamento ?? [])
}

/** União por id, respeitando balcão (Terminal) ou o canal delivery informado. */
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
