import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { nomeExibicaoCabecalhoFromEmpresa } from '../constants/defaultDesignConfig'

/**
 * Preenche cabeçalho do design com dados da API quando o admin não personalizou.
 * Nome de exibição sempre acompanha o fantasia da empresa (campo não editável no design).
 * Logo/capa: design publicado tem prioridade sobre a API.
 */
export function mergeDesignConfigWithEmpresa(
  design: DeliveryPublicoDesignConfig,
  empresa: EmpresaPublicaDTO | null
): DeliveryPublicoDesignConfig {
  if (!empresa) return design

  const nomeApi = empresa.nomeFantasia?.trim() ?? ''
  const nomeDesign = design.cabecalho.nomeExibicao.trim()

  return {
    ...design,
    cabecalho: {
      ...design.cabecalho,
      nomeExibicao: nomeExibicaoCabecalhoFromEmpresa(nomeApi || nomeDesign),
      logoUrl: design.cabecalho.logoUrl ?? empresa.logoUrl,
      capaUrl: design.cabecalho.capaUrl ?? empresa.bannerUrl,
    },
  }
}
