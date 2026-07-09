'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import { canPublishDesign } from '../constants/designPublishRules'
import {
  isDesignConfigEqual,
  readDesignStorage,
  writeDesignStorage,
  writePublishedDesignBySlug,
} from '../utils/designConfigStorage'

type UseDeliveryDesignDraftOptions = {
  empresaId: string | undefined
  slug?: string
  nomeExibicaoFallback?: string
}

export function useDeliveryDesignDraft({
  empresaId,
  slug,
  nomeExibicaoFallback = '',
}: UseDeliveryDesignDraftOptions) {
  const [draft, setDraft] = useState<DeliveryPublicoDesignConfig>(() =>
    createDefaultDesignConfig(nomeExibicaoFallback)
  )
  const [published, setPublished] = useState<DeliveryPublicoDesignConfig>(() =>
    createDefaultDesignConfig(nomeExibicaoFallback)
  )
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!empresaId) return
    const storage = readDesignStorage(empresaId, nomeExibicaoFallback)
    setPublished(storage.published)
    setDraft(storage.draft)
    setHydrated(true)
  }, [empresaId, nomeExibicaoFallback])

  const persist = useCallback(
    (nextPublished: DeliveryPublicoDesignConfig, nextDraft: DeliveryPublicoDesignConfig) => {
      if (!empresaId) return
      writeDesignStorage(empresaId, { published: nextPublished, draft: nextDraft })
    },
    [empresaId]
  )

  const updateDraft = useCallback(
    (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => {
      setDraft(current => {
        const next = updater(current)
        if (empresaId) {
          writeDesignStorage(empresaId, { published, draft: next })
        }
        return next
      })
    },
    [empresaId, published]
  )

  const publish = useCallback(() => {
    if (!canPublishDesign(draft)) return
    setPublished(draft)
    if (empresaId) {
      writeDesignStorage(empresaId, { published: draft, draft })
    }
    if (slug?.trim()) {
      writePublishedDesignBySlug(slug.trim(), draft)
    }
  }, [draft, empresaId, slug])

  const restore = useCallback(() => {
    setDraft(published)
    if (empresaId) {
      writeDesignStorage(empresaId, { published, draft: published })
    }
  }, [empresaId, published])

  const isDirty = useMemo(() => !isDesignConfigEqual(draft, published), [draft, published])

  return {
    draft,
    published,
    hydrated,
    isDirty,
    updateDraft,
    publish,
    restore,
    persist,
  }
}
