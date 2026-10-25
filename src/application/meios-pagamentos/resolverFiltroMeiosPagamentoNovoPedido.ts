import type { MeioPagamento } from '@/src/domain/entities/MeioPagamento'

/**
 * Pedido manual no Gestor (balcão ou delivery): mostra o meio se entrega
 * OU retirada estiver ligada. As duas desligadas ficam só no POS.
 * O canal específico (só entrega / só retirada) vale no checkout do cliente.
 */
export function meioVisivelNoPedidoManual(meio: MeioPagamento): boolean {
  return meio.isDelivery()
}
