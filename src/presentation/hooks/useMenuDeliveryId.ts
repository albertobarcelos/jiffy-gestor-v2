'use client'

import { useMemo } from 'react'
import {
  lerMenuDeliveryIdDeParametroDelivery,
  parseMenuDeliveryId,
} from '@/src/shared/utils/parseMenuDeliveryId'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'

/**
 * Menu publicado no delivery — fonte canônica: `GET /api/delivery/empresas/me`.
 * Fallback em `GET /api/empresas/me` quando a loja delivery ainda não foi ativada (legado).
 */
export function useMenuDeliveryId() {
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const empresaMe = useEmpresaMe()

  const menuDeliveryId = useMemo((): string | null => {
    const parametro = empresaDeliveryQuery.data?.parametroDelivery
    if (parametro) {
      return lerMenuDeliveryIdDeParametroDelivery(parametro as unknown as Record<string, unknown>)
    }

    if (!empresaDeliveryQuery.isPending) {
      return parseMenuDeliveryId({ parametroEmpresa: empresaMe.parametroEmpresa })
    }

    return null
  }, [
    empresaDeliveryQuery.data?.parametroDelivery,
    empresaDeliveryQuery.isPending,
    empresaMe.parametroEmpresa,
  ])

  const isLoading = empresaMe.isLoading || empresaDeliveryQuery.isPending

  return {
    menuDeliveryId,
    empresaDeliveryConfigurada: empresaDeliveryQuery.data != null,
    available: empresaDeliveryQuery.data?.available,
    pendencias: empresaDeliveryQuery.data?.pendencias ?? [],
    isLoading,
    isError: empresaDeliveryQuery.isError,
    isFetching: empresaDeliveryQuery.isFetching,
    refetch: empresaDeliveryQuery.refetch,
  }
}
