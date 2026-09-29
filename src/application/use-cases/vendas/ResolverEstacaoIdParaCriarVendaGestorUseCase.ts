import {
  MSG_ESTACAO_FALHA_VALIDACAO_CRIAR_PEDIDO,
  MSG_ESTACAO_OBRIGATORIA_CRIAR_PEDIDO,
} from '@/src/domain/policies/pedido/estacaoCriarVendaGestor'
import type { IEstacaoParaCriarVendaPort } from '@/src/domain/repositories/IEstacaoParaCriarVendaPort'

export type ResultadoEstacaoCriarVendaGestor =
  | { ok: true; estacaoId: string }
  | { ok: false; codigo: 'AUSENTE' | 'FALHA_VALIDACAO'; mensagem: string }

export class ResolverEstacaoIdParaCriarVendaGestorUseCase {
  constructor(private readonly port: IEstacaoParaCriarVendaPort) {}

  async execute(token?: string | null): Promise<ResultadoEstacaoCriarVendaGestor> {
    try {
      const estacaoId = (await this.port.resolverEstacaoId(token))?.trim() ?? ''
      if (!estacaoId) {
        return {
          ok: false,
          codigo: 'AUSENTE',
          mensagem: MSG_ESTACAO_OBRIGATORIA_CRIAR_PEDIDO,
        }
      }
      return { ok: true, estacaoId }
    } catch {
      return {
        ok: false,
        codigo: 'FALHA_VALIDACAO',
        mensagem: MSG_ESTACAO_FALHA_VALIDACAO_CRIAR_PEDIDO,
      }
    }
  }
}
