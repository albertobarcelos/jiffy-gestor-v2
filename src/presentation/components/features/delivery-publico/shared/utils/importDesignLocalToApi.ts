import type { DeliveryPublicoDesignMeResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { canPublishDesign } from '../constants/designPublishRules'
import {
  clearDesignStorageForEmpresa,
  isDesignConfigEqual,
  markDesignMigrated,
  readDesignStorage,
} from './designConfigStorage'
import { uiDesignConfigToApi } from './mapDeliveryDesignConfig'

type ImportDesignLocalToApiParams = {
  empresaId: string
  nomeExibicaoFallback?: string
  slug?: string
  salvarDraft: (
    input: ReturnType<typeof uiDesignConfigToApi>
  ) => Promise<DeliveryPublicoDesignMeResponseDTO>
  publicar: (
    input: ReturnType<typeof uiDesignConfigToApi>
  ) => Promise<DeliveryPublicoDesignMeResponseDTO>
}

/**
 * Sobe draft/published do localStorage para a API e marca migração.
 * Se o published local for publicável, publica na conta; depois restaura o draft local se diferente.
 */
export async function importDesignLocalToApi({
  empresaId,
  nomeExibicaoFallback = '',
  slug,
  salvarDraft,
  publicar,
}: ImportDesignLocalToApiParams): Promise<DeliveryPublicoDesignMeResponseDTO> {
  const local = readDesignStorage(empresaId, nomeExibicaoFallback)

  let me = await salvarDraft(uiDesignConfigToApi(local.draft))

  if (canPublishDesign(local.published)) {
    me = await salvarDraft(uiDesignConfigToApi(local.published))
    me = await publicar(uiDesignConfigToApi(local.published))

    if (!isDesignConfigEqual(local.draft, local.published)) {
      me = await salvarDraft(uiDesignConfigToApi(local.draft))
    }
  }

  markDesignMigrated(empresaId, 'imported')
  clearDesignStorageForEmpresa(empresaId, slug)

  return me
}
