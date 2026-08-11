'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DeliveryPublicoDesignMeResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import { canPublishDesign } from '../constants/designPublishRules'
import {
  isDesignConfigEqual,
} from '../utils/designConfigStorage'
import {
  apiDesignConfigToUi,
  uiDesignConfigToApi,
} from '../utils/mapDeliveryDesignConfig'
import {
  useDeliveryDesignMe,
  usePublicarDesignDelivery,
  useSalvarDraftDesignDelivery,
} from '@/src/presentation/hooks/useDeliveryDesignMe'

const AUTOSAVE_DEBOUNCE_MS = 700

type UseDeliveryDesignDraftOptions = {
  empresaId: string | undefined
  slug?: string
  nomeExibicaoFallback?: string
  /** Quando false, não dispara a query (ex.: empresa ainda carregando). */
  enabled?: boolean
}

export function useDeliveryDesignDraft({
  empresaId,
  slug: _slug,
  nomeExibicaoFallback = '',
  enabled = true,
}: UseDeliveryDesignDraftOptions) {
  const designQuery = useDeliveryDesignMe(Boolean(empresaId) && enabled)
  const salvarDraftMutation = useSalvarDraftDesignDelivery()
  const publicarMutation = usePublicarDesignDelivery()

  const [draft, setDraft] = useState<DeliveryPublicoDesignConfig>(() =>
    createDefaultDesignConfig(nomeExibicaoFallback)
  )
  const [published, setPublished] = useState<DeliveryPublicoDesignConfig>(() =>
    createDefaultDesignConfig(nomeExibicaoFallback)
  )
  const [hydrated, setHydrated] = useState(false)
  const skipAutosaveRef = useRef(true)
  const lockAutosaveRef = useRef(false)
  const hydratedEmpresaIdRef = useRef<string | undefined>(undefined)

  // Reset local quando troca de empresa
  useEffect(() => {
    if (empresaId !== hydratedEmpresaIdRef.current) {
      setHydrated(false)
      hydratedEmpresaIdRef.current = undefined
      skipAutosaveRef.current = true
    }
  }, [empresaId])

  // Hidrata uma vez a partir da API
  useEffect(() => {
    if (!empresaId || !designQuery.data || hydrated) return

    const uiPublished = apiDesignConfigToUi(
      designQuery.data.published,
      nomeExibicaoFallback
    )
    const uiDraftRaw = apiDesignConfigToUi(
      designQuery.data.draft,
      nomeExibicaoFallback
    )
    // Se o draft perdeu logo/capa no JSON mas o published ainda tem,
    // reaproveita o espelho para o editor não ficar sem preview.
    const uiDraft: DeliveryPublicoDesignConfig = {
      ...uiDraftRaw,
      cabecalho: {
        ...uiDraftRaw.cabecalho,
        logoUrl: uiDraftRaw.cabecalho.logoUrl ?? uiPublished.cabecalho.logoUrl,
        capaUrl: uiDraftRaw.cabecalho.capaUrl ?? uiPublished.cabecalho.capaUrl,
      },
    }
    setPublished(uiPublished)
    setDraft(uiDraft)
    setHydrated(true)
    hydratedEmpresaIdRef.current = empresaId
    skipAutosaveRef.current = true
  }, [empresaId, designQuery.data, hydrated, nomeExibicaoFallback])

  // Autosave do draft (debounce)
  useEffect(() => {
    if (!hydrated || !empresaId) return
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false
      return
    }
    if (lockAutosaveRef.current) return

    // Evita gravar null no lugar da logo/capa enquanto o preview ainda é blob:.
    const hasPendingBlobMidia =
      draft.cabecalho.logoUrl?.startsWith('blob:') ||
      draft.cabecalho.capaUrl?.startsWith('blob:')
    if (hasPendingBlobMidia) return

    const handle = window.setTimeout(() => {
      if (lockAutosaveRef.current) return
      const payload = uiDesignConfigToApi(draft)
      salvarDraftMutation.mutate(payload)
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autosave só quando draft muda
  }, [draft, hydrated, empresaId])

  const updateDraft = useCallback(
    (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => {
      setDraft(current => updater(current))
    },
    []
  )

  const publish = useCallback(async () => {
    if (!canPublishDesign(draft)) {
      throw new Error(
        'Somente o modelo Básico, as paletas publicáveis e a tipografia Urbana podem ser publicados no momento'
      )
    }

    const payload = uiDesignConfigToApi(draft)
    lockAutosaveRef.current = true

    try {
      await salvarDraftMutation.mutateAsync(payload)
      const result = await publicarMutation.mutateAsync(payload)

      const uiPublished = apiDesignConfigToUi(
        result.published,
        nomeExibicaoFallback
      )
      const uiDraft = apiDesignConfigToUi(result.draft, nomeExibicaoFallback)
      skipAutosaveRef.current = true
      setPublished(uiPublished)
      setDraft(uiDraft)
    } finally {
      lockAutosaveRef.current = false
    }
  }, [
    draft,
    nomeExibicaoFallback,
    publicarMutation,
    salvarDraftMutation,
  ])

  const restore = useCallback(async () => {
    lockAutosaveRef.current = true
    try {
      skipAutosaveRef.current = true
      setDraft(published)
      const payload = uiDesignConfigToApi(published)
      await salvarDraftMutation.mutateAsync(payload)
    } finally {
      lockAutosaveRef.current = false
    }
  }, [published, salvarDraftMutation])

  const replaceFromMe = useCallback(
    (me: DeliveryPublicoDesignMeResponseDTO) => {
      skipAutosaveRef.current = true
      lockAutosaveRef.current = false
      setPublished(apiDesignConfigToUi(me.published, nomeExibicaoFallback))
      setDraft(apiDesignConfigToUi(me.draft, nomeExibicaoFallback))
    },
    [nomeExibicaoFallback]
  )

  const isDirty = useMemo(
    () => !isDesignConfigEqual(draft, published),
    [draft, published]
  )

  return {
    draft,
    published,
    hydrated,
    isDirty,
    updateDraft,
    publish,
    restore,
    replaceFromMe,
    salvarDraftAsync: salvarDraftMutation.mutateAsync,
    publicarAsync: publicarMutation.mutateAsync,
    serverPublishedAt: designQuery.data?.publishedAt ?? null,
    isLoading: designQuery.isPending || (Boolean(empresaId) && !hydrated && !designQuery.isError),
    isError: designQuery.isError,
    error: designQuery.error,
    refetch: designQuery.refetch,
    isSavingDraft: salvarDraftMutation.isPending,
    isPublishing: publicarMutation.isPending,
  }
}
