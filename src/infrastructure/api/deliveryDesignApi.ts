import {
  gestorConfigDelete,
  gestorConfigJson,
  type GestorConfigResult,
} from '@/src/infrastructure/api/gestorConfigRequest'
import type { DeliveryPublicoDesignConfigDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'

const DESIGN_ME = '/api/delivery/empresas/me/design'
const DESIGN_DRAFT = '/api/delivery/empresas/me/design/draft'
const DESIGN_PUBLISH = '/api/delivery/empresas/me/design/publish'
const LOGO = '/api/delivery/empresas/me/logo'
const BANNER = '/api/delivery/empresas/me/banner'

export function buscarDesignDeliveryMe(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(DESIGN_ME, token)
}

export function salvarDraftDesignDelivery(
  token: string,
  body: DeliveryPublicoDesignConfigDTO
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(DESIGN_DRAFT, token, { method: 'PUT', json: body })
}

export function publicarDesignDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(DESIGN_PUBLISH, token, { method: 'POST' })
}

export function limparLogoEmpresaDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigDelete(LOGO, token)
}

export function limparBannerEmpresaDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigDelete(BANNER, token)
}
