'use client'

import { useEffect, useState } from 'react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import { readPublishedDesignBySlug } from '../utils/designConfigStorage'

type UsePublishedDesignBySlugOptions = {
  slug: string
  nomeExibicaoFallback?: string
}

/**
 * Lê o design publicado por slug somente após mount (evita hydration mismatch com localStorage).
 */
export function usePublishedDesignBySlug({
  slug,
  nomeExibicaoFallback = '',
}: UsePublishedDesignBySlugOptions) {
  const [config, setConfig] = useState<DeliveryPublicoDesignConfig | null>(null)

  useEffect(() => {
    setConfig(readPublishedDesignBySlug(slug, nomeExibicaoFallback))
  }, [slug, nomeExibicaoFallback])

  return {
    config: config ?? createDefaultDesignConfig(nomeExibicaoFallback),
    hydrated: config !== null,
  }
}
