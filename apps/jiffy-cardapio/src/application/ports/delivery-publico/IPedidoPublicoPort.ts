import type { CreatePedidoPublicoInput } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { PedidoDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/PedidoDeliveryPublicoDTO'

export interface IPedidoPublicoPort {
  criar(input: CreatePedidoPublicoInput): Promise<PedidoDeliveryPublicoDTO>
  consultar(id: string): Promise<PedidoDeliveryPublicoDTO>
}
