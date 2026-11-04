import type { DeliveryPublicoDesignMeResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'

export class BuscarDesignDeliveryMeUseCase {
  constructor(private readonly designApi: IEmpresaDeliveryDesignApi) {}

  execute(token: string): Promise<DeliveryPublicoDesignMeResponseDTO> {
    return this.designApi.buscarMe(token)
  }
}
