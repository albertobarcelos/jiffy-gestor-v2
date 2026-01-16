import { PedidoDelivery } from '../entities/PedidoDelivery'
import { MetodoPagamento } from '../entities/MetodoPagamento'
import { StatusPedido } from '../entities/StatusPedido'

/**
 * Parâmetros para buscar pedidos
 */
export interface BuscarPedidosParams {
  status?: StatusPedido
  dataAtualizacao?: string // Formato: YYYY-MM-DD
}

/**
 * Interface do repositório de delivery
 */
export interface IDeliveryRepository {
  /**
   * Lista os pedidos pendentes (ou filtrados por status/data)
   */
  listarPedidos(params?: BuscarPedidosParams): Promise<PedidoDelivery[]>

  /**
   * Avança o status do pedido para o próximo status disponível
   */
  avancarStatus(pedidoRef: string): Promise<{ status: StatusPedido }>

  /**
   * Cancela um pedido
   */
  cancelarPedido(pedidoRef: string): Promise<{ status: StatusPedido }>

  /**
   * Lista os métodos de pagamento disponíveis
   */
  listarMetodosPagamento(): Promise<MetodoPagamento[]>

  /**
   * Envia o pedido para o serviço de motoboy
   */
  enviarParaMotoboy(
    pedidoRef: string,
    servico?: 'Pega Express' | 'Itz Express' | 'NextLeva'
  ): Promise<void>
}

