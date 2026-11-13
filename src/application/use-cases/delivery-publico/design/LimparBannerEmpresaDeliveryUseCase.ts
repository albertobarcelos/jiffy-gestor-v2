import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'

export class LimparBannerEmpresaDeliveryUseCase {
  constructor(private readonly designApi: IEmpresaDeliveryDesignApi) {}

  execute(token: string): Promise<void> {
    return this.designApi.limparBanner(token)
  }
}
