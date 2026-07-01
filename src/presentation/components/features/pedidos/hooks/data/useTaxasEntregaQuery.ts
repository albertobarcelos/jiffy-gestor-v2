'use client'

import { useMemo } from 'react'
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
  // Só ativa a query quando o painel está aberto e o pedido envolve entrega; o cache
  // (staleTime 5min) é compartilhado entre consumidores via mesma queryKey, evitando refetch redundante.
  const taxasEntregaQuery = useTaxasInfinite({
    limit: 100,
    enabled: open && (pedidoComEntrega || modoVisualizacao),
  })
  const refetchTaxasEntrega = taxasEntregaQuery.refetch

  const taxasEntrega = useMemo(() => {
    return (taxasEntregaQuery.data?.pages.flatMap(page => page.taxas) ?? []).filter(taxa => {
      return taxa.isAtivo() && taxa.getTipo().trim().toLowerCase() === 'entrega'
    })
  }, [taxasEntregaQuery.data])

  return {
    taxasEntrega,
    taxasEntregaQuery,
    refetchTaxasEntrega,
  }
}
