import type { IEmpresaDeliveryDesignApi } from '@/src/application/ports/IEmpresaDeliveryDesignApi'
import {
  deliveryPublicoDesignMeResponseSchema,
  type DeliveryPublicoDesignConfigDTO,
  type DeliveryPublicoDesignMeResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { requireGestorConfig } from '@/src/infrastructure/api/gestorConfigRequest'
import {
  buscarDesignDeliveryMe,
  limparBannerEmpresaDelivery,
  limparLogoEmpresaDelivery,
  publicarDesignDelivery,
  salvarDraftDesignDelivery,
} from '@/src/infrastructure/api/deliveryDesignApi'

function parseMe(raw: unknown): DeliveryPublicoDesignMeResponseDTO {
  return deliveryPublicoDesignMeResponseSchema.parse(raw)
}

export class EmpresaDeliveryDesignApiAdapter implements IEmpresaDeliveryDesignApi {
  async buscarMe(token: string): Promise<DeliveryPublicoDesignMeResponseDTO> {
    return parseMe(requireGestorConfig(await buscarDesignDeliveryMe(token)))
  }

  async salvarDraft(
    token: string,
    body: DeliveryPublicoDesignConfigDTO
  ): Promise<DeliveryPublicoDesignMeResponseDTO> {
    return parseMe(requireGestorConfig(await salvarDraftDesignDelivery(token, body)))
  }

  async publicar(token: string): Promise<DeliveryPublicoDesignMeResponseDTO> {
    return parseMe(requireGestorConfig(await publicarDesignDelivery(token)))
  }

  async limparLogo(token: string): Promise<void> {
    requireGestorConfig(await limparLogoEmpresaDelivery(token))
  }

  async limparBanner(token: string): Promise<void> {
    requireGestorConfig(await limparBannerEmpresaDelivery(token))
  }
}

export const empresaDeliveryDesignApiAdapter = new EmpresaDeliveryDesignApiAdapter()
