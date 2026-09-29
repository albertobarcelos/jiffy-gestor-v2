import { ConsultarConexaoMarketplaceUseCase } from '@/src/application/use-cases/integracoes/ConsultarConexaoMarketplaceUseCase'
import { criarHubMarketplaceAdapter } from '@/src/infrastructure/integracoes/HubMarketplaceAdapter'

export function makeConsultarConexaoMarketplaceUseCase(): ConsultarConexaoMarketplaceUseCase {
  return new ConsultarConexaoMarketplaceUseCase(criarHubMarketplaceAdapter())
}
