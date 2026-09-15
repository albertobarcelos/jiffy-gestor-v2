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
 * Default síncrono no 1º paint; após mount, merge com o design publicado no localStorage.
 */
export function usePublishedDesignBySlug({
  slug,
  nomeExibicaoFallback = '',
}: UsePublishedDesignBySlugOptions) {
  const [config, setConfig] = useState<DeliveryPublicoDesignConfig>(() =>
    createDefaultDesignConfig(nomeExibicaoFallback)
  )
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setConfig(readPublishedDesignBySlug(slug, nomeExibicaoFallback))
    setHydrated(true)
  }, [slug, nomeExibicaoFallback])

  return {
    config,
    hydrated,
  }
}
