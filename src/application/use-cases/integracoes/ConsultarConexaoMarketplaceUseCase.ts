import { Marketplace } from '@/src/domain/integracoes/Marketplace'
import type { IMarketplaceHub } from '@/src/domain/integracoes/IMarketplaceHub'
import { IntegracaoMarketplaceError } from '@/src/domain/integracoes/errors/IntegracaoMarketplaceError'

export type StatusConexaoMarketplace = {
  conectada: boolean
  merchantIdOd: string | null
}

/**
 * Loja conectada = registro ativo da empresa neste marketplace.
 * A sincronização do cardápio só entra depois disto.
 */
export class ConsultarConexaoMarketplaceUseCase {
  constructor(private readonly hub: IMarketplaceHub) {}

  async execute(input: {
    empresaId: string
    marketplace: unknown
  }): Promise<StatusConexaoMarketplace> {
    const marketplace = Marketplace.criar(input.marketplace)
    if (!marketplace) {
      throw new IntegracaoMarketplaceError('Marketplace não suportado.', 400, 'INTEGRACAO_MARKETPLACE_INVALID')
    }
    const empresaId = input.empresaId.trim()
    if (!empresaId) {
      throw new IntegracaoMarketplaceError('Empresa não identificada.', 401, 'INTEGRACAO_EMPRESA_MISSING')
    }

    const lojas = await this.hub.listarLojasAtivas()
    const loja = lojas.find(
      item =>
        item.empresaId === empresaId &&
        item.marketplace === marketplace.codigo &&
        item.active
    )
    return {
      conectada: Boolean(loja),
      merchantIdOd: loja?.merchantIdOd ?? null,
    }
  }
}
