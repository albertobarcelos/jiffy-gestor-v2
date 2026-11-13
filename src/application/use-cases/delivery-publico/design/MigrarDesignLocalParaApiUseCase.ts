import type { DeliveryPublicoDesignMeResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { uiDesignConfigToApi } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import type { IDesignConfigStorage } from '@/src/application/ports/IDesignConfigStorage'
import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'
import { lerDesignLocal } from '@/src/application/services/delivery/lerDesignLocal'
import { PodePublicarDesignDeliveryPolicy } from '@/src/domain/delivery/policies/PodePublicarDesignDeliveryPolicy'

type MigrarDesignLocalInput = {
  empresaId: string
  nomeExibicaoFallback?: string
  slug?: string
}

function configsIguais(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export class MigrarDesignLocalParaApiUseCase {
  constructor(
    private readonly storage: IDesignConfigStorage,
    private readonly designApi: IEmpresaDeliveryDesignApi
  ) {}

  async execute(
    token: string,
    input: MigrarDesignLocalInput
  ): Promise<DeliveryPublicoDesignMeResponseDTO> {
    const nome = input.nomeExibicaoFallback ?? ''
    const local = lerDesignLocal(this.storage.readRaw(input.empresaId), nome)
    const draft = uiDesignConfigToApi(local.draft)

    let me = await this.designApi.salvarDraft(token, draft)

    try {
      const published = uiDesignConfigToApi(local.published)
      if (PodePublicarDesignDeliveryPolicy.check(published)) {
        me = await this.designApi.salvarDraft(token, published)
        me = await this.designApi.publicar(token)
        if (!configsIguais(local.draft, local.published)) {
          me = await this.designApi.salvarDraft(token, draft)
        }
      }
    } catch {
      // Published local inválido não impede de subir o draft.
    }

    this.storage.mark(input.empresaId, 'imported')
    this.storage.clear(input.empresaId, input.slug)
    return me
  }
}
