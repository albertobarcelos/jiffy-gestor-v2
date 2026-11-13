import type { DeliveryPublicoDesignMeResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { DeliveryPublicoDesignUiModel } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import { uiDesignConfigToApi } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'

export class RestaurarDraftDesignDeliveryUseCase {
  constructor(private readonly designApi: IEmpresaDeliveryDesignApi) {}

  execute(
    token: string,
    published: DeliveryPublicoDesignUiModel
  ): Promise<DeliveryPublicoDesignMeResponseDTO> {
    return this.designApi.salvarDraft(token, uiDesignConfigToApi(published))
  }
}
