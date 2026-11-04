import type {
  DeliveryPublicoDesignConfigDTO,
  DeliveryPublicoDesignMeResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'

/**
 * Port de acesso HTTP ao design delivery (BFF).
 * Implementação em infrastructure; use cases dependem só deste contrato.
 * Erros de API devem ser lançados pela implementação.
 */
export interface IEmpresaDeliveryDesignApi {
  buscarMe(token: string): Promise<DeliveryPublicoDesignMeResponseDTO>
  salvarDraft(
    token: string,
    body: DeliveryPublicoDesignConfigDTO
  ): Promise<DeliveryPublicoDesignMeResponseDTO>
  publicar(token: string): Promise<DeliveryPublicoDesignMeResponseDTO>
  limparLogo(token: string): Promise<void>
  limparBanner(token: string): Promise<void>
}
