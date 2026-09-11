import type { GetCatalogoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { ICatalogoPublicoPort } from '@/src/application/ports/delivery-publico'

export class ObterCatalogoPublicoUseCase {
  constructor(private readonly catalogoPort: ICatalogoPublicoPort) {}

  async execute(
    slug: string,
    params?: { offset?: number; limit?: number }
  ): Promise<GetCatalogoPublicoResponseDTO> {
    const slugNormalizado = slug.trim()
    if (!slugNormalizado) {
      throw new Error('Slug é obrigatório')
    }
    return this.catalogoPort.buscarPorSlug(slugNormalizado, params)
  }
}
