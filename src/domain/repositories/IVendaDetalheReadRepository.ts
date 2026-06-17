import type { TabelaOrigemVenda } from '@/src/domain/types/vendaDetalhe'

export type LoadVendaOptions = {
  incluirFiscal?: boolean
  /** Pedido gestor entrega/retirada: prioriza GET módulo delivery. */
  preferirModuloDelivery?: boolean
}

export interface IVendaDetalheReadRepository {
  loadVenda(
    vendaId: string,
    tabelaOrigem: TabelaOrigemVenda,
    token: string,
    options?: LoadVendaOptions
  ): Promise<unknown>

  fetchCliente(clienteId: string, token: string): Promise<Record<string, unknown> | null>

  fetchUsuarioPdv(usuarioId: string, token: string): Promise<Record<string, unknown> | null>

  fetchUsuarioGestor(usuarioId: string, token: string): Promise<Record<string, unknown> | null>

  fetchMeioPagamento(meioId: string, token: string): Promise<Record<string, unknown> | null>

  fetchClienteDeliveryByTelefone(
    telefone: string,
    token: string
  ): Promise<Record<string, unknown> | null>
}
