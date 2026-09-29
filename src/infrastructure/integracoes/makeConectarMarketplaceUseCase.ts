import { ConectarMarketplaceUseCase } from '@/src/application/use-cases/integracoes/ConectarMarketplaceUseCase'
import { criarHubMarketplaceAdapter } from '@/src/infrastructure/integracoes/HubMarketplaceAdapter'

export function makeConectarMarketplaceUseCase(): ConectarMarketplaceUseCase {
  return new ConectarMarketplaceUseCase(criarHubMarketplaceAdapter())
}
