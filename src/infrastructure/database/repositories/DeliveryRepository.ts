import {
  IDeliveryRepository,
  BuscarPedidosParams,
} from '@/src/domain/repositories/IDeliveryRepository'
import { PedidoDelivery } from '@/src/domain/entities/PedidoDelivery'
import { MetodoPagamento } from '@/src/domain/entities/MetodoPagamento'
import { StatusPedido } from '@/src/domain/entities/StatusPedido'
import { DeliveryClient, DeliveryApiError } from '@/src/infrastructure/api/deliveryClient'
import {
  AvancarStatusResponseDTO,
  CancelarPedidoResponseDTO,
  ListarMetodosPagamentoResponseDTO,
} from '@/src/application/dto/DeliveryDTO'

/**
 * Implementação do repositório de delivery
 * Comunica com a API externa de delivery
 */
export class DeliveryRepository implements IDeliveryRepository {
  private deliveryClient: DeliveryClient

  constructor(
    deliveryClient?: DeliveryClient,
    token?: string,
    integradorToken?: string
  ) {
    this.deliveryClient =
      deliveryClient ||
      new DeliveryClient(
        undefined,
        token,
        integradorToken
      )
  }

  setToken(token: string) {
    this.deliveryClient.setToken(token)
  }

  setIntegradorToken(token: string) {
    this.deliveryClient.setIntegradorToken(token)
  }

  async listarPedidos(params?: BuscarPedidosParams): Promise<PedidoDelivery[]> {
    try {
      // Constrói a URL com parâmetros de query
      let url = '/api/delivery/listapedidos'
      const queryParams: string[] = []

      if (params?.status !== undefined) {
        queryParams.push(`status=${params.status}`)
      }

      if (params?.dataAtualizacao) {
        queryParams.push(`data_atualizacao=${params.dataAtualizacao}`)
      }

      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`
      }

      const response = await this.deliveryClient.get<{
        pedidos?: any[]
        items?: any[]
        [key: string]: any
      }>(url)

      // A API pode retornar os pedidos em diferentes formatos
      const pedidosData = response.data.pedidos || response.data.items || []

      return pedidosData.map((pedido: any) => PedidoDelivery.fromJSON(pedido))
    } catch (error) {
      if (error instanceof DeliveryApiError) {
        throw new Error(`Erro ao listar pedidos: ${error.message}`)
      }
      throw error
    }
  }

  async avancarStatus(
    pedidoRef: string
  ): Promise<{ status: StatusPedido }> {
    try {
      const url = `/api/delivery/changestatus?pedido_ref=${encodeURIComponent(pedidoRef)}`
      
      const response = await this.deliveryClient.post<AvancarStatusResponseDTO>(
        url
      )

      return {
        status: response.data.status_pedido,
      }
    } catch (error) {
      if (error instanceof DeliveryApiError) {
        throw new Error(`Erro ao avançar status: ${error.message}`)
      }
      throw error
    }
  }

  async cancelarPedido(
    pedidoRef: string
  ): Promise<{ status: StatusPedido }> {
    try {
      const url = `/api/delivery/cancelaPedido?pedido_ref=${encodeURIComponent(pedidoRef)}`
      
      const response = await this.deliveryClient.post<CancelarPedidoResponseDTO>(
        url
      )

      return {
        status: response.data.status_pedido,
      }
    } catch (error) {
      if (error instanceof DeliveryApiError) {
        throw new Error(`Erro ao cancelar pedido: ${error.message}`)
      }
      throw error
    }
  }

  async listarMetodosPagamento(): Promise<MetodoPagamento[]> {
    try {
      const response = await this.deliveryClient.get<ListarMetodosPagamentoResponseDTO>(
        '/api/delivery/getlistpaymentsmethods'
      )

      return (response.data.formas || []).map((forma) =>
        MetodoPagamento.fromJSON(forma)
      )
    } catch (error) {
      if (error instanceof DeliveryApiError) {
        throw new Error(`Erro ao listar métodos de pagamento: ${error.message}`)
      }
      throw error
    }
  }

  async enviarParaMotoboy(
    pedidoRef: string,
    servico?: 'Pega Express' | 'Itz Express' | 'NextLeva'
  ): Promise<void> {
    try {
      let url = `/api/delivery/sendToMotoboyService?pedido_ref=${encodeURIComponent(pedidoRef)}`
      
      if (servico) {
        url += `&servico=${encodeURIComponent(servico)}`
      }

      await this.deliveryClient.post(url)
    } catch (error) {
      if (error instanceof DeliveryApiError) {
        throw new Error(`Erro ao enviar para motoboy: ${error.message}`)
      }
      throw error
    }
  }
}

