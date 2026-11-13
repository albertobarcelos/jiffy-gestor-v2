import type { IDesignMidiaApi } from '@/src/application/ports/IDesignMidiaApi'

export class EnviarCapaDesignDeliveryUseCase {
  constructor(private readonly midiaApi: IDesignMidiaApi) {}

  execute(file: File, token: string): Promise<void> {
    return this.midiaApi.uploadBanner(file, token)
  }
}
