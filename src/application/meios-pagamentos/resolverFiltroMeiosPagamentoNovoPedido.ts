import type { MeioPagamento } from '@/src/domain/entities/MeioPagamento'

/**
 * Pedido manual no Gestor (balcão ou delivery): mostra o meio se entrega
 * OU retirada estiver ligada. As duas desligadas ficam só no POS.
 * O canal específico (só entrega / só retirada) vale no checkout do cliente.
 */
export function meioVisivelNoPedidoManual(meio: MeioPagamento): boolean {
  return meio.isDelivery()
}

export function coletarMeiosDasPaginas(
  pages?: Array<{ meiosPagamento?: MeioPagamento[] }>
): MeioPagamento[] {
  return (pages ?? []).flatMap(page => page.meiosPagamento ?? [])
}

/** União por id. POS-only (as duas flags off) não entra. */
export function unirMeiosPedidoManual(...listas: MeioPagamento[][]): MeioPagamento[] {
  const porId = new Map<string, MeioPagamento>()
  for (const lista of listas) {
    for (const meio of lista) {
      if (!meioVisivelNoPedidoManual(meio)) continue
      porId.set(meio.getId(), meio)
    }
  }
  return [...porId.values()]
}
