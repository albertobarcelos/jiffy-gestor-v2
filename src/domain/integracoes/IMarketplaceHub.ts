import type { SolicitacaoConexaoMarketplace } from '@/src/domain/integracoes/SolicitacaoConexaoMarketplace'

/**
 * URL de autorização do provedor (login). O Gestor não implementa o callback.
 * O segredo do hub nunca entra neste contrato.
 */
export type AutorizacaoMarketplace = {
  authorizationUrl: string
}

export type LojaMarketplace = {
  id: string
  empresaId: string
  marketplace: string
  merchantIdOd: string
  active: boolean
}

/**
 * Porta do hub de marketplaces. Uma implementação, todos os canais.
 * A aplicação não escolhe microserviço por marketplace.
 */
export interface IMarketplaceHub {
  iniciarConexao(solicitacao: SolicitacaoConexaoMarketplace): Promise<AutorizacaoMarketplace>
  listarLojasAtivas(): Promise<LojaMarketplace[]>
}
