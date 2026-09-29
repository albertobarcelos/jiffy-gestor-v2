import { ResolverEstacaoImpressaoDestePcUseCase } from '@/src/application/use-cases/estacao-impressao/ResolverEstacaoImpressaoDestePcUseCase'
import type { IEstacaoParaCriarVendaPort } from '@/src/domain/repositories/IEstacaoParaCriarVendaPort'
import { EstacaoImpressaoApiRepository } from '@/src/infrastructure/api/repositories/EstacaoImpressaoApiRepository'
import { estacaoDestePcLocalStore } from '@/src/infrastructure/printing/EstacaoDestePcLocalStore'

export class EstacaoParaCriarVendaAdapter implements IEstacaoParaCriarVendaPort {
  async resolverEstacaoId(token?: string | null): Promise<string | null> {
    const access = token?.trim()
    if (access) {
      const gateway = new EstacaoImpressaoApiRepository(access)
      const cfg = await new ResolverEstacaoImpressaoDestePcUseCase(
        gateway,
        estacaoDestePcLocalStore
      ).execute()
      const id = cfg.estacaoId.trim()
      return id || null
    }
    return estacaoDestePcLocalStore.obterId()
  }
}

export const estacaoParaCriarVendaPort = new EstacaoParaCriarVendaAdapter()
