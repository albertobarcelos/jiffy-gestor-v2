import type { GetMeiosPagamentoPublicosResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { IMeiosPagamentoPublicoPort } from '@/src/application/ports/delivery-publico'

export class ListarMeiosPagamentoPublicoUseCase {
  constructor(private readonly meiosPort: IMeiosPagamentoPublicoPort) {}

  async execute(slug: string): Promise<GetMeiosPagamentoPublicosResponseDTO> {
    const slugNormalizado = slug.trim()
    if (!slugNormalizado) {
      throw new Error('Slug é obrigatório')
    }
    return this.meiosPort.listarPorSlug(slugNormalizado)
  }
}
