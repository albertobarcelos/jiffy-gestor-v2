import type { GetMeiosPagamentoPublicosResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizarMeiosPagamentoPublicos } from '@/src/application/mappers/normalizarMeiosPagamentoPublicos'
import type { IMeiosPagamentoPublicoPort } from '@/src/application/ports/delivery-publico'

export class ListarMeiosPagamentoPublicoUseCase {
  constructor(private readonly meiosPort: IMeiosPagamentoPublicoPort) {}

  async execute(slug: string): Promise<GetMeiosPagamentoPublicosResponseDTO> {
    const slugNormalizado = slug.trim()
    if (!slugNormalizado) {
      throw new Error('Slug é obrigatório')
    }
    const resposta = await this.meiosPort.listarPorSlug(slugNormalizado)
    return normalizarMeiosPagamentoPublicos(resposta)
  }
}
