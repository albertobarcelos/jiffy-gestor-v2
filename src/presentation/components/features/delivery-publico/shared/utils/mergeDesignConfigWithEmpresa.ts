import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { CABECALHO_NOME_MAX_LENGTH } from '../constants/defaultDesignConfig'

function resolveMidiaUrl(
  preferida: string | null | undefined,
  espelho: string | null | undefined
): string | null {
  for (const candidate of [preferida, espelho]) {
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (!trimmed || trimmed.startsWith('blob:')) continue
    return trimmed
  }
  return null
}

/**
 * Preenche cabeçalho com dados da empresa (FK/CDN = fonte de verdade).
 * Espelhos no design só entram se a API não trouxer URL.
 */
export function mergeDesignConfigWithEmpresa(
  design: DeliveryPublicoDesignConfig,
  empresa: EmpresaPublicaDTO | null
): DeliveryPublicoDesignConfig {
  if (!empresa) return design

  const nomeDesign = design.cabecalho.nomeExibicao.trim()
  const nomeVitrine =
    empresa.nomeExibicao?.trim() || empresa.nomeFantasia?.trim() || ''

  return {
    ...design,
    cabecalho: {
      ...design.cabecalho,
      // Design enriquecido / nomeExibicao da API têm prioridade; fantasia é fallback.
      nomeExibicao: (nomeDesign || nomeVitrine).slice(0, CABECALHO_NOME_MAX_LENGTH),
      logoUrl: resolveMidiaUrl(empresa.logoUrl, design.cabecalho.logoUrl),
      capaUrl: resolveMidiaUrl(empresa.bannerUrl, design.cabecalho.capaUrl),
    },
  }
}
