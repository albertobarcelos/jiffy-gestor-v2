import {
  enderecoSnapshotParaEnderecoEntregaDetalhe,
  extrairContextoEntregaDeVendaData,
} from '@/src/application/mappers/ContextoEntregaDeliveryMapper'
import type { EnderecoEntregaDetalhe } from '@/src/domain/types/vendaDetalhe'
import type { ModoKanbanVendas } from '@/src/presentation/components/features/kanban'
import type { TipoEntregaDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import type { VendaUnificadaDTO } from '@/src/presentation/components/features/kanban/hooks/useVendasUnificadas'
import { pedidoKanbanUsaEndpointDelivery } from './observacaoPedidoKanban'
import type { ColunaKanbanId, Venda } from '@/src/presentation/components/features/kanban/types'

/** Colunas em que o backend ainda permite PATCH de tipo/endereço (antes de `EM_ROTA`). */
export const COLUNAS_KANBAN_ALTERAR_ENDERECO_ENTREGA: ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
]

export function normalizarTipoEntregaVendaKanban(
  venda: Pick<Venda, 'tipoVenda'>
): TipoEntregaDeliveryApi {
  const tipo = String(venda.tipoVenda ?? '')
    .trim()
    .toLowerCase()
  return tipo === 'retirada' ? 'retirada' : 'entrega'
}

export function extrairTipoEntregaPedidoDeliveryApi(data: unknown): TipoEntregaDeliveryApi {
  const registro = normalizarRegistroApi(data)
  const tipo = String(registro.tipoEntrega ?? registro.tipoVenda ?? '')
    .trim()
    .toLowerCase()
  return tipo === 'retirada' ? 'retirada' : 'entrega'
}

function podeAlterarPedidoEntregaKanban(
  columnId: ColunaKanbanId,
  venda: Venda,
  modoKanbanVendas: ModoKanbanVendas,
  tiposPermitidos: readonly TipoEntregaDeliveryApi[]
): boolean {
  if (modoKanbanVendas !== 'delivery') return false

  const tipo = String(venda.tipoVenda ?? '')
    .trim()
    .toLowerCase()
  if (!tiposPermitidos.includes(tipo as TipoEntregaDeliveryApi)) return false
  if (!pedidoKanbanUsaEndpointDelivery(venda)) return false

  return COLUNAS_KANBAN_ALTERAR_ENDERECO_ENTREGA.includes(columnId)
}

/** Botão de endereço — apenas entrega (retirada não tem endereço). */
export function deveExibirBotaoAlterarEnderecoEntregaKanban(
  columnId: ColunaKanbanId,
  venda: Venda,
  modoKanbanVendas: ModoKanbanVendas
): boolean {
  return podeAlterarPedidoEntregaKanban(columnId, venda, modoKanbanVendas, ['entrega'])
}

/** Duplo clique no ícone de tipo — entrega e retirada (alterna o tipo do pedido). */
export function deveExibirAcaoAlterarTipoPedidoKanban(
  columnId: ColunaKanbanId,
  venda: Venda,
  modoKanbanVendas: ModoKanbanVendas
): boolean {
  return podeAlterarPedidoEntregaKanban(columnId, venda, modoKanbanVendas, ['entrega', 'retirada'])
}

function normalizarRegistroApi(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const o = data as Record<string, unknown>
  if (o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)) {
    return o.data as Record<string, unknown>
  }
  return o
}

export type ContextoEnderecoPedidoKanban = {
  telefone: string | null
  enderecoDeliveryIdRef: string | null
  enderecoAtual: EnderecoEntregaDetalhe | null
}

export function extrairContextoEnderecoPedidoDeliveryApi(
  data: unknown
): ContextoEnderecoPedidoKanban {
  const registro = normalizarRegistroApi(data)
  const contexto = extrairContextoEntregaDeVendaData(registro)

  return {
    telefone: contexto?.destinatarioTelefone?.trim() || null,
    enderecoDeliveryIdRef: contexto?.enderecoDeliveryIdRef?.trim() || null,
    enderecoAtual: enderecoSnapshotParaEnderecoEntregaDetalhe(contexto?.enderecoEntrega ?? null),
  }
}

/** Usa `contextoEntrega` do summary no card — evita GET /pedidos/:id só para ver endereço. */
export function extrairContextoEnderecoDeVendaKanban(
  venda: Pick<VendaUnificadaDTO, 'contextoEntrega'>
): ContextoEnderecoPedidoKanban | null {
  const contexto = venda.contextoEntrega
  if (!contexto) return null

  return {
    telefone:
      contexto.destinatarioTelefone?.trim() || contexto.clienteDeliveryTelefoneRef?.trim() || null,
    enderecoDeliveryIdRef: contexto.enderecoDeliveryIdRef?.trim() || null,
    enderecoAtual: enderecoSnapshotParaEnderecoEntregaDetalhe(contexto.enderecoEntrega ?? null),
  }
}

export function pedidoDeliveryPatchUrl(vendaId: string): string {
  return `/api/delivery/pedidos/${encodeURIComponent(vendaId)}`
}
