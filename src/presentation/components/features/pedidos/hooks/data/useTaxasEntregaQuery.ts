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
  // Lista do select de taxa precisa estar fresca após cadastro em /taxas.
  // staleTime 0 + refetchOnMount always: o cache de 5 min da listagem geral não esconde taxa nova.
  const taxasEntregaQuery = useTaxasInfinite({
    limit: 100,
    enabled: open && (pedidoComEntrega || modoVisualizacao),
    staleTime: 0,
    refetchOnMount: 'always',
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
