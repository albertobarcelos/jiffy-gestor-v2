import {
  avaliarEmissaoFiscalDelivery,
  MENSAGEM_EMISSAO_DELIVERY_SO_FINALIZADO,
  type ContextoEmissaoFiscalDelivery,
} from '@/src/domain/services/pedido/RegrasEmissaoFiscalDelivery'

const COLUNAS_FISCAIS_APOS_FINALIZACAO = new Set([
  'FINALIZADAS',
  'PENDENTE_EMISSAO',
  'REJEITADAS',
  'COM_FISCAL',
])

export type VendaEmissaoFiscalKanban = {
  tabelaOrigem: 'venda' | 'venda_gestor'
  tipoVenda?: string | null
  statusEtapaOperacional?: string | null
  getEtapaKanban?: () => string
  isCancelada?: () => boolean
}

function contextoEmissaoFiscalDaVendaKanban(
  venda: VendaEmissaoFiscalKanban
): ContextoEmissaoFiscalDelivery {
  return {
    tabelaOrigem: venda.tabelaOrigem,
    tipoVenda: venda.tipoVenda,
    statusEtapaOperacional: venda.statusEtapaOperacional,
    cancelado: venda.isCancelada?.() ?? false,
  }
}

function colunaFiscalAposFinalizacao(columnId?: string | null): boolean {
  return COLUNAS_FISCAIS_APOS_FINALIZACAO.has(String(columnId ?? '').trim().toUpperCase())
}

/**
 * Gate de UI: o domínio decide pela etapa operacional; se a listagem não
 * trouxe status, a coluna fiscal de Entregues vale como evidência de finalizado.
 */
export function vendaKanbanPermiteEmissaoFiscalDelivery(
  venda: VendaEmissaoFiscalKanban,
  columnId?: string | null
): boolean {
  const decisao = avaliarEmissaoFiscalDelivery(contextoEmissaoFiscalDaVendaKanban(venda))
  if (decisao === 'liberado') return true
  if (decisao === 'bloqueado') return false

  const coluna = columnId ?? venda.getEtapaKanban?.() ?? null
  return colunaFiscalAposFinalizacao(coluna)
}

export function assertVendaKanbanPodeEmitirFiscalDelivery(
  venda: VendaEmissaoFiscalKanban,
  columnId?: string | null
): void {
  if (!vendaKanbanPermiteEmissaoFiscalDelivery(venda, columnId)) {
    throw new Error(MENSAGEM_EMISSAO_DELIVERY_SO_FINALIZADO)
  }
}
