'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import {
  carregarMvpLayout,
  cloneLayout,
  MVP_LAYOUT_DEFAULT,
  ordenarColunasPorCatalogo,
  salvarMvpLayout,
  type MvpPersonalizacaoLayout,
} from '../mvpPersonalizacao'

export function useMvpPersonalizacao() {
  const empresaId = useTenantEmpresaId()
  const [layout, setLayoutState] = useState<MvpPersonalizacaoLayout>(() => carregarMvpLayout(empresaId))
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setLayoutState(carregarMvpLayout(empresaId))
    setHydrated(true)
  }, [empresaId])

  const persistLayout = useCallback(
    (next: MvpPersonalizacaoLayout) => {
      const normalizado: MvpPersonalizacaoLayout = {
        colunas: ordenarColunasPorCatalogo(next.colunas),
        paineis: { ...next.paineis },
      }
      setLayoutState(normalizado)
      salvarMvpLayout(empresaId, normalizado)
    },
    [empresaId]
  )

  const patchLayout = useCallback(
    (patch: Partial<MvpPersonalizacaoLayout>) => {
      persistLayout({ ...layout, ...patch, paineis: patch.paineis ?? layout.paineis })
    },
    [layout, persistLayout]
  )

  const patchPaineis = useCallback(
    (patch: Partial<MvpPersonalizacaoLayout['paineis']>) => {
      persistLayout({ ...layout, paineis: { ...layout.paineis, ...patch } })
    },
    [layout, persistLayout]
  )

  const resetLayout = useCallback(() => {
    persistLayout(cloneLayout(MVP_LAYOUT_DEFAULT))
  }, [persistLayout])

  return {
    layout,
    hydrated,
    persistLayout,
    patchLayout,
    patchPaineis,
    resetLayout,
  }
}
