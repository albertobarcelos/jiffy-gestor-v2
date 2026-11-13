import type {
  DeliveryPublicoDesignConfigDTO,
  DeliveryPublicoDesignMeResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'
import { validarPublicacaoDesign } from '@/src/application/services/delivery/validarPublicacaoDesign'

export class PublicarLayoutDesignDeliveryUseCase {
  constructor(private readonly designApi: IEmpresaDeliveryDesignApi) {}

  async execute(
    token: string,
    draft: DeliveryPublicoDesignConfigDTO
  ): Promise<DeliveryPublicoDesignMeResponseDTO> {
    const validado = validarPublicacaoDesign(draft)
    await this.designApi.salvarDraft(token, validado)
    return this.designApi.publicar(token)
  }
}
