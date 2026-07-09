'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchGrupoProdutoImagemUrl } from '@/src/infrastructure/api/deliveryMediaApi'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import type { DesignCategoriaGrupo } from '../types/designCategoriaGrupo'

type UseDesignCategoriaGruposImagensParams = {
  grupos: DesignCategoriaGrupo[]
  enabled: boolean
  onResolved: (grupos: DesignCategoriaGrupo[]) => void
}

export function useDesignCategoriaGruposImagens({
  grupos,
  enabled,
  onResolved,
}: UseDesignCategoriaGruposImagensParams) {
  const { auth } = useAuthStore()
  const [isResolving, setIsResolving] = useState(false)
  const onResolvedRef = useRef(onResolved)
  const gruposRef = useRef(grupos)

  useEffect(() => {
    onResolvedRef.current = onResolved
  }, [onResolved])

  useEffect(() => {
    gruposRef.current = grupos
  }, [grupos])

  const grupoIdsKey = useMemo(() => grupos.map(grupo => grupo.id).join('|'), [grupos])

  useEffect(() => {
    if (!enabled || !grupoIdsKey) {
      setIsResolving(false)
      return
    }

    let cancelled = false

    ;(async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsResolving(true)

      try {
        const currentGrupos = gruposRef.current
        const enriched = await Promise.all(
          currentGrupos.map(async grupo => {
            const deliveryUrl = await fetchGrupoProdutoImagemUrl(grupo.id, token)
            const resolvedUrl = deliveryUrl?.trim() || grupo.imagemUrl?.trim() || null
            return {
              ...grupo,
              imagemUrl: resolvedUrl,
            }
          })
        )

        if (!cancelled) {
          onResolvedRef.current(enriched)
        }
      } finally {
        if (!cancelled) {
          setIsResolving(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [auth, enabled, grupoIdsKey])

  return { isResolvingImagens: isResolving }
}
