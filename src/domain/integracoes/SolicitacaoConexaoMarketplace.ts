import { IntegracaoMarketplaceError } from '@/src/domain/integracoes/errors/IntegracaoMarketplaceError'
import { Marketplace } from '@/src/domain/integracoes/Marketplace'
import { MerchantIdOd } from '@/src/domain/integracoes/MerchantIdOd'

export type SolicitacaoConexaoMarketplaceInput = {
  empresaId: unknown
  marketplace: unknown
  merchantIdOd: unknown
}

/**
 * Pedido de conexão da empresa aberta a um marketplace.
 * Não conhece HTTP, OAuth nem o hub.
 */
export class SolicitacaoConexaoMarketplace {
  private constructor(
    readonly empresaId: string,
    readonly marketplace: Marketplace,
    readonly merchantIdOd: MerchantIdOd
  ) {}

  static criar(input: SolicitacaoConexaoMarketplaceInput): SolicitacaoConexaoMarketplace {
    const empresaId = typeof input.empresaId === 'string' ? input.empresaId.trim() : ''
    if (!empresaId) {
      throw new IntegracaoMarketplaceError(
        'Empresa não identificada na sessão.',
        401,
        'INTEGRACAO_EMPRESA_AUSENTE'
      )
    }

    const marketplace = Marketplace.criar(input.marketplace)
    if (!marketplace) {
      throw new IntegracaoMarketplaceError(
        'Marketplace não suportado.',
        400,
        'INTEGRACAO_MARKETPLACE_INVALIDO'
      )
    }

    const merchantIdOd = MerchantIdOd.criar(input.merchantIdOd)
    if (!merchantIdOd) {
      throw new IntegracaoMarketplaceError(
        'Informe o ID da loja no marketplace.',
        400,
        'INTEGRACAO_MERCHANT_ID_INVALID'
      )
    }

    return new SolicitacaoConexaoMarketplace(empresaId, marketplace, merchantIdOd)
  }
}
