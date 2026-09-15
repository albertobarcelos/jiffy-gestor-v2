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
}

/**
 * Design publicado + merge opcional com empresa → CSS vars do customizador.
 */
export function useDeliveryPublicoTheme({
  slug,
  nomeExibicaoFallback = '',
  empresa = null,
}: UseDeliveryPublicoThemeOptions) {
  const { config: publishedConfig, hydrated } = usePublishedDesignBySlug({
    slug,
    nomeExibicaoFallback,
  })

  const config = useMemo(
    () => mergeDesignConfigWithEmpresa(publishedConfig, empresa),
    [publishedConfig, empresa]
  )

  const themeStyle = useMemo(() => applyDesignConfig(config), [config])

  return { config, themeStyle, hydrated }
}
