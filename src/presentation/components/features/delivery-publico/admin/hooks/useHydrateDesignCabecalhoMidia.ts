'use client'

import { useEffect, useRef } from 'react'
import { fetchEmpresaPublicaMidia } from '@/src/infrastructure/api/publicDeliveryApi'
import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'

function isPersistedImageUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.trim().length > 0 && !url.startsWith('blob:')
}

function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

type UseHydrateDesignCabecalhoMidiaOptions = {
  slug?: string
  hasEmpresaDelivery: boolean
  /** Só hidrata após o draft da API estar pronto. */
  enabled?: boolean
  /**
   * Espelho do published (fallback quando FK/CDN do catálogo vem vazio,
   * mas o design publicado ainda tem URL — ex.: logo só no JSON).
   */
  publishedLogoUrl?: string | null
  publishedCapaUrl?: string | null
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

/**
 * Preenche logo/capa do draft a partir das FKs/CDN da empresa delivery.
 * Roda no nível da screen (não só na aba Cabeçalho) para o preview/admin
 * não ficarem sem mídia ao trocar de guia.
 */
export function useHydrateDesignCabecalhoMidia({
  slug,
  hasEmpresaDelivery,
  enabled = true,
  publishedLogoUrl = null,
  publishedCapaUrl = null,
  onChange,
}: UseHydrateDesignCabecalhoMidiaOptions) {
  const hydratedSlugRef = useRef<string | null>(null)

  useEffect(() => {
    const trimmedSlug = slug?.trim()
    if (!enabled || !trimmedSlug || !hasEmpresaDelivery) return
    if (hydratedSlugRef.current === trimmedSlug) return

    let cancelled = false

    void fetchEmpresaPublicaMidia(trimmedSlug)
      .then(({ logoUrl: apiLogo, bannerUrl: apiBanner }) => {
        if (cancelled) return

        onChange(current => {
          const nextLogo = isPersistedImageUrl(current.cabecalho.logoUrl)
            ? current.cabecalho.logoUrl
            : isPersistedImageUrl(apiLogo)
              ? apiLogo
              : publishedLogoUrl
          const nextCapa = isPersistedImageUrl(current.cabecalho.capaUrl)
            ? current.cabecalho.capaUrl
            : isPersistedImageUrl(apiBanner)
              ? apiBanner
              : publishedCapaUrl

          if (
            nextLogo === current.cabecalho.logoUrl &&
            nextCapa === current.cabecalho.capaUrl
          ) {
            return current
          }

          revokeBlobUrl(current.cabecalho.logoUrl)
          revokeBlobUrl(current.cabecalho.capaUrl)

          return {
            ...current,
            cabecalho: {
              ...current.cabecalho,
              logoUrl: nextLogo ?? null,
              capaUrl: nextCapa ?? null,
            },
          }
        })

        hydratedSlugRef.current = trimmedSlug
      })
      .catch(() => {
        // Não marca como hidratado: permite retry em remount/refetch.
      })

    return () => {
      cancelled = true
    }
  }, [
    slug,
    hasEmpresaDelivery,
    enabled,
    publishedLogoUrl,
    publishedCapaUrl,
    onChange,
  ])
}
