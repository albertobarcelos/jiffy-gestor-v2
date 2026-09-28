import type { IEstacaoParaCriarVendaPort } from '@/src/domain/repositories/IEstacaoParaCriarVendaPort'
import { resolverEstacaoIdParaCriarVendaGestor } from '@/src/infrastructure/api/estacoesImpressaoApi'

export class EstacaoParaCriarVendaAdapter implements IEstacaoParaCriarVendaPort {
  resolverEstacaoId(token?: string | null): Promise<string | null> {
    return resolverEstacaoIdParaCriarVendaGestor(token)
  }
}

export const estacaoParaCriarVendaPort = new EstacaoParaCriarVendaAdapter()
