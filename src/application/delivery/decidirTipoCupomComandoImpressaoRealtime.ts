import type { ModoImpressaoDelivery, TipoCupomDelivery } from '@/src/shared/types/deliveryImpressao'

/**
 * Tipo de cupom para o comando Socket.IO PEDIDO_DELIVERY_IMPRESSAO_SOLICITADA.
 * Backend já decidiu imprimir; só mapeamos o layout pelo modo da empresa (sem gate imprimirAoReceber).
 */
export function decidirTipoCupomComandoImpressaoRealtime(
  modo: ModoImpressaoDelivery
): TipoCupomDelivery {
  return modo === 'unificado' ? 'producao_completa' : 'producao_cozinha'
}
