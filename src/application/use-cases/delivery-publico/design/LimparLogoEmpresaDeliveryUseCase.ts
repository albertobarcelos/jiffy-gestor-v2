import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'

export class LimparLogoEmpresaDeliveryUseCase {
  constructor(private readonly designApi: IEmpresaDeliveryDesignApi) {}

  execute(token: string): Promise<void> {
    return this.designApi.limparLogo(token)
  }
}
