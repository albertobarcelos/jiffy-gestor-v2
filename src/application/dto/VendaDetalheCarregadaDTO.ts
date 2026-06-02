import type {
  PagamentoSelecionado,
  ProdutoSelecionado,
  StatusVenda,
} from '@/src/domain/types/pedido'
import type {
  DetalhesEntregaPedido,
  DetalhesPedidoMeta,
  FluxoPagamentoEntrega,
  OrigemVenda,
  ResumoFinanceiroDetalhes,
  ResumoFiscalVenda,
} from '@/src/domain/types/vendaDetalhe'

/** DTO completo para hidratar o NovoPedidoModal a partir de uma venda carregada. */
export interface VendaDetalheCarregadaDTO {
  origem: OrigemVenda | null
  status: StatusVenda
  /** Status fiscal unificado (API detalhe + resumo). */
  statusFiscal: string | null
  clienteId: string | null
  clienteNome: string | null
  produtos: ProdutoSelecionado[]
  pagamentos: PagamentoSelecionado[]
  fluxoPagamentoEntrega: FluxoPagamentoEntrega
  detalhesPedidoMeta: DetalhesPedidoMeta | null
  resumoFiscal: ResumoFiscalVenda | null
  resumoFinanceiroDetalhes: ResumoFinanceiroDetalhes | null
  detalhesEntregaPedido: DetalhesEntregaPedido | null
  nomesUsuariosPedido: Record<string, string>
  nomesMeiosPagamentoPedido: Record<string, string>
  dataVenda: string | null
  valorFinalVenda: number | null
  dataFinalizacaoCarregada: string | null
  vendaGestorJaCancelada: boolean
  /** Quando true, o modal deve ir direto para o step 4 (modo visualização). */
  irParaStep4: boolean
}
