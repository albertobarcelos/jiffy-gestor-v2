import type { IDesignMidiaApi, MidiaPublicaDesign } from '@/src/application/ports/IDesignMidiaApi'

export class BuscarMidiaPublicaDesignUseCase {
  constructor(private readonly midiaApi: IDesignMidiaApi) {}

  execute(slug: string): Promise<MidiaPublicaDesign> {
    return this.midiaApi.buscarMidiaPublica(slug)
  }
}
