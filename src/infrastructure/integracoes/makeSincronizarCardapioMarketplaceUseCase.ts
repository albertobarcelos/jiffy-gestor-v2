import { SincronizarCardapioMarketplaceUseCase } from '@/src/application/use-cases/integracoes/SincronizarCardapioMarketplaceUseCase'
import { criarHubMarketplaceAdapter } from '@/src/infrastructure/integracoes/HubMarketplaceAdapter'

export function makeSincronizarCardapioMarketplaceUseCase(): SincronizarCardapioMarketplaceUseCase {
  return new SincronizarCardapioMarketplaceUseCase(criarHubMarketplaceAdapter())
}
