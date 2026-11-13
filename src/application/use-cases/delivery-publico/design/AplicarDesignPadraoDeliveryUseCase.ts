import type { DeliveryPublicoDesignMeResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { DeliveryPublicoDesignUiModel } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import { uiDesignConfigToApi } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'
import { montarDesignPadraoPreservandoCabecalho } from '@/src/application/services/delivery/lerDesignLocal'

export class AplicarDesignPadraoDeliveryUseCase {
  constructor(private readonly designApi: IEmpresaDeliveryDesignApi) {}

  execute(
    token: string,
    draft: DeliveryPublicoDesignUiModel,
    nomeExibicaoFallback: string
  ): Promise<DeliveryPublicoDesignMeResponseDTO> {
    const next = montarDesignPadraoPreservandoCabecalho(draft, nomeExibicaoFallback)
    return this.designApi.salvarDraft(token, uiDesignConfigToApi(next))
  }
}
