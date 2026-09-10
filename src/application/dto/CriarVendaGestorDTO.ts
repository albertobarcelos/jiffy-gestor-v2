import type {
  PagamentoSelecionado,
  ProdutoSelecionado,
  StatusVenda,
} from '@/src/domain/types/pedido'
import type {
  FluxoPagamentoEntrega,
  MoradaEntregaSelecionada,
  OrigemVenda,
  TipoAtendimentoDelivery,
} from '@/src/domain/types/vendaDetalhe'

export interface CriarVendaGestorInputDTO {
  tipoInicioPedido: 'balcao' | 'entrega'
  origem: OrigemVenda
  status: StatusVenda
  produtos: ProdutoSelecionado[]
  pagamentos: PagamentoSelecionado[]
  totalProdutos: number
  totalPagamentos: number
  totalPagamentosLancados: number
  clienteId?: string
  clienteEntregaVinculado?: { id: string; nome: string } | null
  tipoAtendimentoDelivery: TipoAtendimentoDelivery
  tempoPrevistoMinutos: number
  pedidoComEntrega: boolean
  taxaEntregaSelecionada?: { getId(): string } | null
  /**
   * Seleção do wizard: vazio = automática (backend calcula), `__sem_taxa__` = 0,
   * senão taxa do catálogo (`valorTaxaEntrega` no POST).
   */
  taxaEntregaId?: string | null
  /** Prévia da cotação; o create automático ainda omite o campo. */
  taxaEntregaCoberturaValor?: number | null
  valorTaxaEntrega: number
  moradaEntregaSelecionada?: MoradaEntregaSelecionada | null
  entregaComCobrancaPeloEntregador: boolean
  valorRecebido: string
  trocoLancamento: number
  statusPagamentoPedido: 'pendente' | 'parcial' | 'pago'
  valorAPagar: number
  meiosPagamento: Array<{ getId(): string; getNome(): string }>
  nomesMeiosPagamentoPedido: Record<string, string>
  observacaoPedido?: string
}

export type { CriarVendaGestorApiRequest as CriarVendaGestorPayload } from '@/src/application/dto/api/vendaGestorApi'

export interface CriarVendaGestorResultDTO {
  payload: import('@/src/application/dto/api/vendaGestorApi').CriarVendaGestorApiRequest
}
