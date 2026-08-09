'use client'

import { useMemo } from 'react'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'
import { parsePreferenciasImpressaoDelivery } from '@/src/shared/utils/parsePreferenciasImpressaoDelivery'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'

/**
 * Preferências de impressão delivery — fonte canônica: `GET /api/delivery/empresas/me`.
 * Fallback em `GET /api/empresas/me` quando a loja delivery ainda não foi ativada.
 */
export function usePreferenciasImpressaoDelivery() {
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const empresaMe = useEmpresaMe()

  const preferenciasImpressaoDelivery = useMemo((): PreferenciasImpressaoDelivery => {
    const parametro = empresaDeliveryQuery.data?.parametroDelivery
    if (parametro) {
      return parsePreferenciasImpressaoDelivery({
        parametroDelivery: parametro as unknown as Record<string, unknown>,
      })
    }

    if (!empresaDeliveryQuery.isPending) {
      return empresaMe.preferenciasImpressaoDelivery
    }

    return empresaMe.preferenciasImpressaoDelivery ?? DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY
  }, [
    empresaDeliveryQuery.data?.parametroDelivery,
    empresaDeliveryQuery.isPending,
    empresaMe.preferenciasImpressaoDelivery,
  ])

  const isLoading = empresaMe.isLoading || empresaDeliveryQuery.isPending

  return {
    preferenciasImpressaoDelivery,
    empresaDeliveryConfigurada: empresaDeliveryQuery.data != null,
    isLoading,
  }
}
