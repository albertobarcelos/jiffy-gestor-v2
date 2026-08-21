import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { CABECALHO_NOME_MAX_LENGTH } from '../constants/defaultDesignConfig'

/**
 * Preenche cabeçalho do design com dados da API quando o admin não personalizou.
 * Design publicado tem prioridade sobre a API.
 */
export function mergeDesignConfigWithEmpresa(
  design: DeliveryPublicoDesignConfig,
  empresa: EmpresaPublicaDTO | null
): DeliveryPublicoDesignConfig {
  if (!empresa) return design

  const nomeDesign = design.cabecalho.nomeExibicao.trim()
  const nomeApi = empresa.nomeFantasia?.trim() ?? ''

  return {
    ...design,
    cabecalho: {
      ...design.cabecalho,
      nomeExibicao: (nomeDesign || nomeApi).slice(0, CABECALHO_NOME_MAX_LENGTH),
      logoUrl: design.cabecalho.logoUrl ?? empresa.logoUrl,
      capaUrl: design.cabecalho.capaUrl ?? empresa.bannerUrl,
    },
  }
}
