import type { GetCatalogoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export interface ICatalogoPublicoPort {
  buscarPorSlug(
    slug: string,
    params?: { offset?: number; limit?: number }
  ): Promise<GetCatalogoPublicoResponseDTO>
}
