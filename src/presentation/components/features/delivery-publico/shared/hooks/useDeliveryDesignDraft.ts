'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DeliveryPublicoDesignMeResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { montarDesignPadraoPreservandoCabecalho } from '@/src/application/services/delivery/lerDesignLocal'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import { canPublishDesign, getPublishDisabledReason } from '../constants/designPublishRules'
import { isDesignConfigEqual } from '../utils/designConfigStorage'
import { apiDesignConfigToUi, uiDesignConfigToApi } from '../utils/mapDeliveryDesignConfig'
import {
  useAplicarDesignPadraoDelivery,
  useDeliveryDesignMe,
  usePublicarLayoutDesignDelivery,
  useRestaurarDraftDesignDelivery,
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
  const publicarLayoutMutation = usePublicarLayoutDesignDelivery()
  const restaurarMutation = useRestaurarDraftDesignDelivery()
  const aplicarPadraoMutation = useAplicarDesignPadraoDelivery()

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

  useEffect(() => {
    if (empresaId !== hydratedEmpresaIdRef.current) {
      setHydrated(false)
      hydratedEmpresaIdRef.current = undefined
      skipAutosaveRef.current = true
    }
  }, [empresaId])

  useEffect(() => {
    if (!empresaId || !designQuery.data || hydrated) return

    const uiPublished = apiDesignConfigToUi(
      designQuery.data.published,
      nomeExibicaoFallback
    )
    const uiDraftRaw = apiDesignConfigToUi(designQuery.data.draft, nomeExibicaoFallback)
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

  useEffect(() => {
    if (!hydrated || !empresaId) return
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false
      return
    }
    if (lockAutosaveRef.current) return

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
        getPublishDisabledReason(draft) ??
          'Esta combinação de layout, paleta ou tipografia não pode ser publicada no momento'
      )
    }

    lockAutosaveRef.current = true

    try {
      const result = await publicarLayoutMutation.mutateAsync(uiDesignConfigToApi(draft))

      const uiPublished = apiDesignConfigToUi(result.published, nomeExibicaoFallback)
      const uiDraft = apiDesignConfigToUi(result.draft, nomeExibicaoFallback)
      skipAutosaveRef.current = true
      setPublished(uiPublished)
      setDraft(uiDraft)
    } finally {
      lockAutosaveRef.current = false
    }
  }, [draft, nomeExibicaoFallback, publicarLayoutMutation])

  const restore = useCallback(async () => {
    lockAutosaveRef.current = true
    try {
      skipAutosaveRef.current = true
      setDraft(published)
      await restaurarMutation.mutateAsync(published)
    } finally {
      lockAutosaveRef.current = false
    }
  }, [published, restaurarMutation])

  const applyDefaultDesign = useCallback(async () => {
    const next = montarDesignPadraoPreservandoCabecalho(draft, nomeExibicaoFallback)
    if (isDesignConfigEqual(draft, next)) return

    lockAutosaveRef.current = true
    try {
      skipAutosaveRef.current = true
      setDraft(next)
      await aplicarPadraoMutation.mutateAsync({
        draft,
        nomeExibicaoFallback,
      })
    } finally {
      lockAutosaveRef.current = false
    }
  }, [aplicarPadraoMutation, draft, nomeExibicaoFallback])

  const replaceFromMe = useCallback(
    (me: DeliveryPublicoDesignMeResponseDTO) => {
      skipAutosaveRef.current = true
      lockAutosaveRef.current = false
      setPublished(apiDesignConfigToUi(me.published, nomeExibicaoFallback))
      setDraft(apiDesignConfigToUi(me.draft, nomeExibicaoFallback))
    },
    [nomeExibicaoFallback]
  )

  const isDirty = useMemo(() => !isDesignConfigEqual(draft, published), [draft, published])

  const isAtDefaultDesign = useMemo(
    () =>
      isDesignConfigEqual(
        draft,
        montarDesignPadraoPreservandoCabecalho(draft, nomeExibicaoFallback)
      ),
    [draft, nomeExibicaoFallback]
  )

  return {
    draft,
    published,
    hydrated,
    isDirty,
    isAtDefaultDesign,
    updateDraft,
    publish,
    restore,
    applyDefaultDesign,
    replaceFromMe,
    serverPublishedAt: designQuery.data?.publishedAt ?? null,
    isLoading:
      designQuery.isPending || (Boolean(empresaId) && !hydrated && !designQuery.isError),
    isError: designQuery.isError,
    error: designQuery.error,
    refetch: designQuery.refetch,
    isSavingDraft:
      salvarDraftMutation.isPending ||
      restaurarMutation.isPending ||
      aplicarPadraoMutation.isPending,
    isPublishing: publicarLayoutMutation.isPending,
  }
}
