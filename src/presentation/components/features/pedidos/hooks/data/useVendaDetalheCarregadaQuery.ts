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
  tipoVendaGestor?: string | null
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
    /** Modal fechado = query inativa; sem isso o cache antigo persiste (refetchOnMount global é false). */
    refetchType: 'all',
  })
}

/** Atualiza observação no cache do detalhe sem esperar refetch (Kanban PATCH observação). */
export function patchVendaDetalheObservacaoPedidoCache(
  queryClient: QueryClient,
  empresaId: string | null,
  vendaId: string,
  observacao: string
) {
  const texto = observacao.trim()
  queryClient.setQueriesData<VendaDetalheCarregadaDTO>(
    { queryKey: ['tenant', empresaId, 'venda-detalhe-carregada', vendaId] },
    atual => {
      if (!atual) return atual
      return {
        ...atual,
        observacaoPedido: texto || null,
        detalhesEntregaPedido: atual.detalhesEntregaPedido
          ? {
              ...atual.detalhesEntregaPedido,
              observacaoPedido: texto || null,
            }
          : atual.detalhesEntregaPedido,
      }
    }
  )
}

export type VendaDetalheResumoFiscalPatch = {
  statusFiscal?: string | null
  documentoFiscalId?: string | null
  numeroFiscal?: number | null
  serieFiscal?: number | string | null
  dataEmissaoFiscal?: string | null
  modelo?: number | null
  retornoSefaz?: string | null
}

function temCampoFiscalNoPatch(patch: VendaDetalheResumoFiscalPatch): boolean {
  return (
    patch.statusFiscal !== undefined ||
    patch.documentoFiscalId !== undefined ||
    patch.numeroFiscal !== undefined ||
    patch.serieFiscal !== undefined ||
    patch.dataEmissaoFiscal !== undefined ||
    patch.modelo !== undefined ||
    patch.retornoSefaz !== undefined
  )
}

/**
 * Atualiza resumoFiscal/statusFiscal no cache do detalhe (aba Fiscal do modal)
 * após emitir/reemitir no Kanban — sem esperar invalidate/refetch.
 */
export function patchVendaDetalheResumoFiscalCache(
  queryClient: QueryClient,
  vendaId: string,
  patch: VendaDetalheResumoFiscalPatch,
  empresaId?: string | null
) {
  if (!temCampoFiscalNoPatch(patch)) return

  const filter =
    empresaId != null && empresaId !== ''
      ? { queryKey: ['tenant', empresaId, 'venda-detalhe-carregada', vendaId] as const }
      : {
          predicate: (query: { queryKey: readonly unknown[] }) => {
            const key = query.queryKey
            return (
              Array.isArray(key) &&
              key[0] === 'tenant' &&
              key[2] === 'venda-detalhe-carregada' &&
              key[3] === vendaId
            )
          },
        }

  queryClient.setQueriesData<VendaDetalheCarregadaDTO>(filter, atual => {
    if (!atual) return atual

    const base = atual.resumoFiscal ?? {}
    const serie =
      patch.serieFiscal !== undefined
        ? patch.serieFiscal == null || String(patch.serieFiscal).trim() === ''
          ? null
          : String(patch.serieFiscal).trim()
        : (base.serie ?? null)

    return {
      ...atual,
      statusFiscal:
        patch.statusFiscal !== undefined ? patch.statusFiscal : atual.statusFiscal,
      resumoFiscal: {
        ...base,
        status:
          patch.statusFiscal !== undefined ? patch.statusFiscal : (base.status ?? null),
        retornoSefaz:
          patch.retornoSefaz !== undefined ? patch.retornoSefaz : (base.retornoSefaz ?? null),
        documentoFiscalId:
          patch.documentoFiscalId !== undefined
            ? patch.documentoFiscalId
            : (base.documentoFiscalId ?? null),
        numero:
          patch.numeroFiscal !== undefined ? patch.numeroFiscal : (base.numero ?? null),
        serie,
        dataEmissao:
          patch.dataEmissaoFiscal !== undefined
            ? patch.dataEmissaoFiscal
            : (base.dataEmissao ?? null),
        modelo: patch.modelo !== undefined ? patch.modelo : (base.modelo ?? null),
      },
    }
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
  tipoVendaGestor,
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
        tipoVendaGestor,
      }),
    enabled: enabled && !!token && !!vendaId,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
    /** Garante GET fresco ao reabrir o modal após invalidate (global refetchOnMount é false). */
    refetchOnMount: true,
    retry: 1,
  })
}
