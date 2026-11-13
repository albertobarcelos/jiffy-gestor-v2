import type { IDesignMidiaApi } from '@/src/application/ports/IDesignMidiaApi'

export class BuscarImagensGruposDesignUseCase {
  constructor(private readonly midiaApi: IDesignMidiaApi) {}

  execute(grupoIds: string[], token: string): Promise<Record<string, string | null>> {
    return this.midiaApi.buscarImagensGrupos(grupoIds, token)
  }
}
