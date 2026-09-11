import type { CreatePedidoPublicoInput } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { CreatePedidoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/CreatePedidoPublicoResponseDTO'

export interface IPedidoPublicoPort {
  criar(input: CreatePedidoPublicoInput): Promise<CreatePedidoPublicoResponseDTO>
}
