/** Props exclusivas da camada de apresentação (modal Novo Pedido). */

import type { AbaDetalhesPedido } from '@/src/domain/types/vendaDetalhe'

export interface NovoPedidoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Chamado após o painel terminar a transição de saída */
  onAfterClose?: () => void
  vendaId?: string
  modoVisualizacao?: boolean
  /**
   * Edição de produtos de um pedido delivery já existente (botão "Editar produtos" do card).
   * Abre direto na etapa de produtos, sem fluxo de criação, e salva via PATCH (diff add/remove).
   * Só faz sentido com `vendaId` e `tipoInicioPedido='entrega'`.
   */
  modoEdicaoProdutos?: boolean
  /** GET gestor vs PDV; com `incluirFiscal=true` no carregamento */
  tabelaOrigemVenda?: 'venda' | 'venda_gestor'
  /** `statusFiscal` do GET vendas unificado (Kanban) */
  statusFiscalUnificado?: string | null
  /** `tipoVenda` do unificado (Kanban) — orienta GET delivery vs gestor no detalhe. */
  tipoVendaGestor?: string | null
  /** Ao abrir detalhes (step 4), seleciona esta aba — ex.: pagamentos antes de finalizar. */
  abaDetalhesInicial?: AbaDetalhesPedido
  /**
   * Canal escolhido no EscolhaTipoPedidoModal.
   * balcao: step inicial = Informações; entrega: step inicial = Produtos.
   */
  tipoInicioPedido?: 'balcao' | 'entrega'
}
