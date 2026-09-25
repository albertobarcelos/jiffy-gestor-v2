'use client'

import { useMemo } from 'react'
import type { NcmCestFiscalLeitura } from '@/src/domain/policies/produto/ncmCestDoBlocoFiscal'
import { listarNcmCestFiscalPorProdutoIdsUseCase } from '@/src/infrastructure/composition/produtoFiscalUseCases'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'

const VAZIO: NcmCestFiscalLeitura = { ncm: '', cest: '', indisponivel: false }

/**
 * NCM/CEST do detalhe do pedido: só bloco fiscal via use case.
 * Não usa `ncm` da venda nem da raiz do produto.
 */
export function useNcmCestFiscalPorProdutoIds(produtoIds: readonly string[]) {
  const ids = useMemo(() => {
    const unicos = new Set<string>()
    for (const id of produtoIds) {
      const trimmed = id.trim()
      if (trimmed) unicos.add(trimmed)
    }
    return [...unicos].sort()
  }, [produtoIds])

  const chave = ids.join(',')

  return useSecureTenantQuery(
    ['produtos', 'ncm-cest-fiscal', chave],
    ({ token }) => listarNcmCestFiscalPorProdutoIdsUseCase.execute(ids, token),
    {
      enabled: ids.length > 0,
      staleTime: 60_000,
    }
  )
}

export function ncmCestFiscalDoMapa(
  mapa: Record<string, NcmCestFiscalLeitura> | undefined,
  produtoId: string
): NcmCestFiscalLeitura {
  return mapa?.[produtoId.trim()] ?? VAZIO
}
