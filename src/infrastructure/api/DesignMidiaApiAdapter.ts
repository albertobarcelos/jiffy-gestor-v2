import type { IDesignMidiaApi, MidiaPublicaDesign } from '@/src/application/ports/IDesignMidiaApi'
import {
  fetchGruposProdutoImagemUrlsBatch,
  uploadEmpresaDeliveryBanner,
  uploadEmpresaDeliveryLogo,
} from '@/src/infrastructure/api/deliveryMediaApi'
import { fetchEmpresaPublicaMidia } from '@/src/infrastructure/api/empresaDeliveryMidiaApi'

export class DesignMidiaApiAdapter implements IDesignMidiaApi {
  async uploadLogo(file: File, token: string): Promise<void> {
    await uploadEmpresaDeliveryLogo(file, token)
  }

  async uploadBanner(file: File, token: string): Promise<void> {
    await uploadEmpresaDeliveryBanner(file, token)
  }

  buscarMidiaPublica(slug: string): Promise<MidiaPublicaDesign> {
    return fetchEmpresaPublicaMidia(slug)
  }

  buscarImagensGrupos(
    grupoIds: string[],
    token: string
  ): Promise<Record<string, string | null>> {
    return fetchGruposProdutoImagemUrlsBatch(grupoIds, token)
  }
}

export const designMidiaApi = new DesignMidiaApiAdapter()
