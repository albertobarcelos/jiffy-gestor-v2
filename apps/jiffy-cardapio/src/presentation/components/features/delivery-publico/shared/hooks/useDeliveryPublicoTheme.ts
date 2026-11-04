'use client'

import { useMemo } from 'react'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { mergeDesignConfigWithEmpresa } from '../utils/mergeDesignConfigWithEmpresa'
import { applyDesignConfig } from '../theme/applyDesignPreviewTheme'
import { usePublishedDesignBySlug } from './usePublishedDesignBySlug'

type UseDeliveryPublicoThemeOptions = {
  slug: string
  nomeExibicaoFallback?: string
  empresa?: EmpresaPublicaDTO | null
  /** Ver `usePublishedDesignBySlug` — evita flash até o catálogo carregar. */
  designReady?: boolean
}

/**
 * Design publicado do catálogo (`empresa.design`) + merge com mídia/nome da empresa → CSS vars.
 */
export function useDeliveryPublicoTheme({
  slug,
  nomeExibicaoFallback = '',
  empresa = null,
  designReady = false,
}: UseDeliveryPublicoThemeOptions) {
  const { config: publishedConfig, hydrated } = usePublishedDesignBySlug({
    slug,
    nomeExibicaoFallback,
    empresa,
    designReady,
  })

  const config = useMemo(
    () => mergeDesignConfigWithEmpresa(publishedConfig, empresa),
    [publishedConfig, empresa]
  )

  const themeStyle = useMemo(() => applyDesignConfig(config), [config])

  return { config, themeStyle, hydrated }
}
