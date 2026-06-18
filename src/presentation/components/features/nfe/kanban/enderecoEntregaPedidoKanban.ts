import {
  enderecoSnapshotParaEnderecoEntregaDetalhe,
  extrairContextoEntregaDeVendaData,
} from '@/src/application/mappers/ContextoEntregaDeliveryMapper'
import type { EnderecoEntregaDetalhe } from '@/src/domain/types/vendaDetalhe'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import { pedidoKanbanUsaEndpointDelivery } from './observacaoPedidoKanban'
import type { ColunaKanbanId, Venda } from './types'

/** Colunas em que o backend ainda permite PATCH de endereço (antes de `EM_ROTA`). */
export const COLUNAS_KANBAN_ALTERAR_ENDERECO_ENTREGA: ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
]

export function deveExibirBotaoAlterarEnderecoEntregaKanban(
  columnId: ColunaKanbanId,
  venda: Venda,
  modoKanbanVendas: ModoKanbanVendas
): boolean {
  if (modoKanbanVendas !== 'delivery') return false

  const tipo = String(venda.tipoVenda ?? '')
    .trim()
    .toLowerCase()
  if (tipo !== 'entrega') return false
  if (!pedidoKanbanUsaEndpointDelivery(venda)) return false

  return COLUNAS_KANBAN_ALTERAR_ENDERECO_ENTREGA.includes(columnId)
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

export function pedidoDeliveryPatchUrl(vendaId: string): string {
  return `/api/delivery/pedidos/${encodeURIComponent(vendaId)}`
}
