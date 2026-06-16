import type { CriarVendaGestorInputDTO } from '@/src/application/dto/CriarVendaGestorDTO'

/** Input do wizard para criação via `POST /delivery/pedidos`. */
export interface CriarPedidoDeliveryInputDTO extends CriarVendaGestorInputDTO {
  /** Telefone normalizado da busca de entrega (obrigatório no delivery). */
  telefoneCliente: string
}

export type { CriarPedidoDeliveryApiRequest as CriarPedidoDeliveryPayload } from '@/src/application/dto/api/pedidoDeliveryApi'

export interface CriarPedidoDeliveryResultDTO {
  payload: import('@/src/application/dto/api/pedidoDeliveryApi').CriarPedidoDeliveryApiRequest
}
