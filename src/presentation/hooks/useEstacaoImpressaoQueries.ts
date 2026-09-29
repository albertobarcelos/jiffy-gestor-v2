'use client'

import type {
  EstacaoImpressaoConfigResolvida,
  EstacaoImpressaoResumo,
  ImpressoraLogica,
} from '@/src/domain/estacao-impressao/EstacaoImpressao'
import { criarEstacaoImpressaoUseCases } from '@/src/presentation/hooks/estacao-impressao/criarEstacaoDestePcUseCases'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'

const STALE_MS = 1000 * 60 * 5

export function useImpressorasLogicasEstacao(enabled: boolean) {
  return useSecureTenantQuery<ImpressoraLogica[]>(
    ['estacao-impressao', 'impressoras-logicas'],
    ({ token }) => criarEstacaoImpressaoUseCases(token).impressorasLogicas.execute(),
    {
      enabled,
      staleTime: STALE_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}

export function useEstacoesImpressao(enabled: boolean) {
  return useSecureTenantQuery<EstacaoImpressaoResumo[]>(
    ['estacao-impressao', 'lista'],
    ({ token }) => criarEstacaoImpressaoUseCases(token).listar.execute(),
    {
      enabled,
      staleTime: STALE_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}

export function useEstacaoImpressaoDestePc(enabled: boolean) {
  return useSecureTenantQuery<EstacaoImpressaoConfigResolvida>(
    ['estacao-impressao', 'deste-pc'],
    ({ token }) => criarEstacaoImpressaoUseCases(token).resolverDestePc.execute(),
    {
      enabled,
      staleTime: STALE_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}

export function useInvalidateEstacaoImpressaoQueries() {
  const invalidate = useInvalidateTenantQueries()

  return () => {
    criarEstacaoImpressaoUseCases('').invalidarCacheMapeamentos()
    void invalidate(['estacao-impressao', 'impressoras-logicas'])
    void invalidate(['estacao-impressao', 'deste-pc'])
    void invalidate(['estacao-impressao', 'lista'])
  }
}
