import type {
  DeliveryPublicoDesignConfigDTO,
  DeliveryPublicoDesignMeResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'
import { validarDraftDesign } from '@/src/application/services/delivery/validarDraftDesign'

export class SalvarDraftDesignDeliveryUseCase {
  constructor(private readonly designApi: IEmpresaDeliveryDesignApi) {}

  execute(
    token: string,
    input: unknown
  ): Promise<DeliveryPublicoDesignMeResponseDTO> {
    const body: DeliveryPublicoDesignConfigDTO = validarDraftDesign(input)
    return this.designApi.salvarDraft(token, body)
  }
}
