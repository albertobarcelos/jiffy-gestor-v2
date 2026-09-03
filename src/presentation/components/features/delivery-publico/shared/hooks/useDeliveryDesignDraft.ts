'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import {
  createDefaultDesignConfig,
  syncNomeExibicaoCabecalho,
} from '../constants/defaultDesignConfig'
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
    const nextPublished = syncNomeExibicaoCabecalho(storage.published, nomeExibicaoFallback)
    const nextDraft = syncNomeExibicaoCabecalho(storage.draft, nomeExibicaoFallback)
    setPublished(nextPublished)
    setDraft(nextDraft)
    setHydrated(true)

    // Mantém localStorage alinhado ao fantasia atual (campo read-only do design).
    if (nextPublished !== storage.published || nextDraft !== storage.draft) {
      writeDesignStorage(empresaId, { published: nextPublished, draft: nextDraft })
      if (slug?.trim()) {
        writePublishedDesignBySlug(slug.trim(), nextPublished)
      }
    }
  }, [empresaId, nomeExibicaoFallback, slug])

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
        const next = syncNomeExibicaoCabecalho(updater(current), nomeExibicaoFallback)
        if (empresaId) {
          writeDesignStorage(empresaId, { published, draft: next })
        }
        return next
      })
    },
    [empresaId, published, nomeExibicaoFallback]
  )

  const publish = useCallback(() => {
    const toPublish = syncNomeExibicaoCabecalho(draft, nomeExibicaoFallback)
    if (!canPublishDesign(toPublish)) return
    setDraft(toPublish)
    setPublished(toPublish)
    if (empresaId) {
      writeDesignStorage(empresaId, { published: toPublish, draft: toPublish })
    }
    if (slug?.trim()) {
      writePublishedDesignBySlug(slug.trim(), toPublish)
    }
  }, [draft, empresaId, slug, nomeExibicaoFallback])

  const restore = useCallback(() => {
    const restored = syncNomeExibicaoCabecalho(published, nomeExibicaoFallback)
    setDraft(restored)
    if (empresaId) {
      writeDesignStorage(empresaId, { published, draft: restored })
    }
  }, [empresaId, published, nomeExibicaoFallback])

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
