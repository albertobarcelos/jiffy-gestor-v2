import type { CotacaoPedidoPublicoInput } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { CotacaoPedidoPublicoDTO } from '@/src/application/dto/delivery-publico/CotacaoPedidoPublicoDTO'

export interface ICotacaoPedidoPublicoPort {
  cotar(input: CotacaoPedidoPublicoInput): Promise<CotacaoPedidoPublicoDTO>
}
