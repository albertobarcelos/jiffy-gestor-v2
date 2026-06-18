'use client'

import { useEffect, useMemo } from 'react'
import { useTaxasInfinite } from '@/src/presentation/hooks/useTaxas'

export type UseTaxasEntregaQueryParams = {
  open: boolean
  modoVisualizacao: boolean
  pedidoComEntrega: boolean
}

export function useTaxasEntregaQuery({
  open,
  modoVisualizacao,
  pedidoComEntrega,
}: UseTaxasEntregaQueryParams) {
  const taxasEntregaQuery = useTaxasInfinite({ limit: 100 })
  const refetchTaxasEntrega = taxasEntregaQuery.refetch

  const taxasEntrega = useMemo(() => {
    return (taxasEntregaQuery.data?.pages.flatMap(page => page.taxas) ?? []).filter(taxa => {
      return taxa.isAtivo() && taxa.getTipo().trim().toLowerCase() === 'entrega'
    })
  }, [taxasEntregaQuery.data])

  useEffect(() => {
    if (!open || modoVisualizacao || !pedidoComEntrega) return
    void refetchTaxasEntrega()
  }, [open, modoVisualizacao, pedidoComEntrega, refetchTaxasEntrega])

  return {
    taxasEntrega,
    taxasEntregaQuery,
    refetchTaxasEntrega,
  }
}
