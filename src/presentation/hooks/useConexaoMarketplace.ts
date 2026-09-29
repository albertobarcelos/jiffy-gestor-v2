'use client'

import type { MarketplaceCodigo } from '@/src/domain/integracoes/Marketplace'
import type { StatusConexaoMarketplace } from '@/src/application/use-cases/integracoes/ConsultarConexaoMarketplaceUseCase'
import { fetchBffJson } from '@/src/infrastructure/api/bffClient'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'

export function useConexaoMarketplace(marketplace: MarketplaceCodigo) {
  return useSecureTenantQuery<StatusConexaoMarketplace>(
    ['integracoes', 'status', marketplace],
    ({ token }) =>
      fetchBffJson<StatusConexaoMarketplace>(
        `/api/integracoes/status?marketplace=${encodeURIComponent(marketplace)}`,
        token
      ),
    { staleTime: 30_000 }
  )
}
