'use client'

import { useMemo } from 'react'
import { useMenuDeliveryId } from '@/src/presentation/hooks/useMenuDeliveryId'

export type PendenciaDeliveryGestor =
  | 'empresa_delivery'
  | 'menu_delivery'

const LABEL_PENDENCIA: Record<PendenciaDeliveryGestor, string> = {
  empresa_delivery: 'Escolha o nome/link da sua loja delivery',
  menu_delivery: 'Escolha qual Menu será usado.',
}

/**
 * Status mínimo para operar venda delivery no gestor:
 * registro de empresa delivery + `menuDeliveryId`.
 */
export function useDeliveryGestorConfigStatus() {
  const {
    menuDeliveryId,
    empresaDeliveryConfigurada,
    isLoading,
    isFetching,
    refetch,
  } = useMenuDeliveryId()

  const pendencias = useMemo((): PendenciaDeliveryGestor[] => {
    if (isLoading) return []
    const items: PendenciaDeliveryGestor[] = []
    if (!empresaDeliveryConfigurada) {
      items.push('empresa_delivery')
      items.push('menu_delivery')
      return items
    }
    if (!menuDeliveryId) {
      items.push('menu_delivery')
    }
    return items
  }, [empresaDeliveryConfigurada, isLoading, menuDeliveryId])

  const pendenciasLabels = useMemo(
    () => pendencias.map(id => LABEL_PENDENCIA[id]),
    [pendencias]
  )

  const prontoParaVendaDelivery = !isLoading && pendencias.length === 0

  return {
    isLoading,
    isFetching,
    refetch,
    empresaDeliveryConfigurada,
    menuDeliveryId,
    pendencias,
    pendenciasLabels,
    prontoParaVendaDelivery,
    temPendencia: !isLoading && pendencias.length > 0,
  }
}
