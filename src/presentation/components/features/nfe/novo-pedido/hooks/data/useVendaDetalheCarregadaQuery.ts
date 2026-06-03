'use client'

import { useQuery, type QueryClient } from '@tanstack/react-query'
import type { VendaDetalheCarregadaDTO } from '@/src/application/dto/VendaDetalheCarregadaDTO'
import { CarregarVendaDetalheUseCase } from '@/src/application/use-cases/vendas/CarregarVendaDetalheUseCase'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

const STALE_TIME_MS = 1000 * 60 * 5
const GC_TIME_MS = 1000 * 60 * 30

interface MeioPagamentoCacheItem {
  getId(): string
  getNome(): string
}

export type VendaDetalheCarregadaQueryParams = {
  vendaId: string
  tabelaOrigemVenda: 'venda' | 'venda_gestor'
  modoVisualizacao: boolean
  token: string | null | undefined
  enabled: boolean
  meiosPagamentoCache?: MeioPagamentoCacheItem[]
}

export function vendaDetalheCarregadaQueryKey(args: {
  empresaId: string | null
  vendaId: string
  tabelaOrigemVenda: 'venda' | 'venda_gestor'
  modoVisualizacao: boolean
}) {
  return [
    'tenant',
    args.empresaId,
    'venda-detalhe-carregada',
    args.vendaId,
    args.tabelaOrigemVenda,
    args.modoVisualizacao ? 'visualizacao' : 'edicao',
  ] as const
}

export function invalidateVendaDetalheCarregadaCache(
  queryClient: QueryClient,
  empresaId: string | null,
  vendaId: string
) {
  return queryClient.invalidateQueries({
    queryKey: ['tenant', empresaId, 'venda-detalhe-carregada', vendaId],
  })
}

const useCase = new CarregarVendaDetalheUseCase()

export function useVendaDetalheCarregadaQuery({
  vendaId,
  tabelaOrigemVenda,
  modoVisualizacao,
  token,
  enabled,
  meiosPagamentoCache = [],
}: VendaDetalheCarregadaQueryParams) {
  const empresaId = useTenantEmpresaId()
  const queryKey = vendaDetalheCarregadaQueryKey({
    empresaId,
    vendaId,
    tabelaOrigemVenda,
    modoVisualizacao,
  })

  return useQuery<VendaDetalheCarregadaDTO, Error>({
    queryKey,
    queryFn: () =>
      useCase.execute({
        vendaId,
        tabelaOrigemVenda,
        token: token!,
        modoVisualizacao,
        meiosPagamentoCache,
      }),
    enabled: enabled && !!token && !!vendaId,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
