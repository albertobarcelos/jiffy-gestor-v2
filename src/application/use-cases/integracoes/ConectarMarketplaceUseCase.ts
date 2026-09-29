import type {
  AutorizacaoMarketplace,
  IMarketplaceHub,
} from '@/src/domain/integracoes/IMarketplaceHub'
import { SolicitacaoConexaoMarketplace } from '@/src/domain/integracoes/SolicitacaoConexaoMarketplace'

export type ConectarMarketplaceInput = {
  empresaId: unknown
  marketplace: unknown
  merchantIdOd: unknown
}

/**
 * Uma regra para todos os marketplaces: valida o pedido e pede a conexão ao hub.
 * Não escolhe adapter por canal e não conhece URL, secret nem OAuth.
 */
export class ConectarMarketplaceUseCase {
  constructor(private readonly hub: IMarketplaceHub) {}

  async execute(input: ConectarMarketplaceInput): Promise<AutorizacaoMarketplace> {
    const solicitacao = SolicitacaoConexaoMarketplace.criar(input)
    return this.hub.iniciarConexao(solicitacao)
  }
}
