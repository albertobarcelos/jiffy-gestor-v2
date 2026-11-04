import type {
  DeliveryPublicoDesignConfigDTO,
  DeliveryPublicoDesignMeResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'
import { validarPublicacaoDesign } from '@/src/application/services/delivery/validarPublicacaoDesign'

export class PublicarDesignDeliveryUseCase {
  constructor(private readonly designApi: IEmpresaDeliveryDesignApi) {}

  /**
   * @param draftAtual — se informado, aplica o gate FE antes do POST (BE ainda valida).
   */
  execute(
    token: string,
    draftAtual?: DeliveryPublicoDesignConfigDTO
  ): Promise<DeliveryPublicoDesignMeResponseDTO> {
    if (draftAtual !== undefined) {
      validarPublicacaoDesign(draftAtual)
    }
    return this.designApi.publicar(token)
  }
}
