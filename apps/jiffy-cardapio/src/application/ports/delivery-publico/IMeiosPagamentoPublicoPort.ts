import type { GetMeiosPagamentoPublicosResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export interface IMeiosPagamentoPublicoPort {
  listarPorSlug(slug: string): Promise<GetMeiosPagamentoPublicosResponseDTO>
}
