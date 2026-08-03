'use client'

import { useMemo } from 'react'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { deliveryPublicoDesignConfigSchema } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import { apiDesignConfigToUi } from '../utils/mapDeliveryDesignConfig'

type UsePublishedDesignBySlugOptions = {
  slug: string
  nomeExibicaoFallback?: string
  /** Empresa do catálogo (fonte do design publicado). */
  empresa?: EmpresaPublicaDTO | null
  /**
   * `true` quando a 1ª página do catálogo já respondeu (sucesso ou erro).
   * Evita flash de defaults antes de `empresa.design` chegar.
   */
  designReady?: boolean
}

/**
 * Resolve o design publicado a partir de `empresa.design` do catálogo.
 * Sem design na API → defaults (não lê mais localStorage no caminho feliz).
 */
export function usePublishedDesignBySlug({
  slug: _slug,
  nomeExibicaoFallback = '',
  empresa = null,
  designReady = false,
}: UsePublishedDesignBySlugOptions) {
  const config = useMemo((): DeliveryPublicoDesignConfig => {
    const fallbackNome =
      nomeExibicaoFallback || empresa?.nomeFantasia || ''

    if (empresa?.design) {
      const parsed = deliveryPublicoDesignConfigSchema.safeParse(empresa.design)
      if (parsed.success) {
        return apiDesignConfigToUi(parsed.data, fallbackNome)
      }
    }

    return createDefaultDesignConfig(fallbackNome)
  }, [empresa, nomeExibicaoFallback])

  return {
    config,
    hydrated: designReady,
  }
}
