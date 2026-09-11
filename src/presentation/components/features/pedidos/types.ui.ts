/** Props exclusivas da camada de apresentação (modal Novo Pedido). */

import type { Cliente } from '@/src/domain/entities/Cliente'
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
  /**
   * Etapa do card no Kanban. O GET `/delivery/pedidos/{id}` pode falhar em EM_ROTA
   * e o fallback gestor ficar desatualizado.
   */
  statusEtapaOperacionalHint?: string | null
  /** Entregador do card Kanban — preenche nome/WhatsApp se o GET do detalhe omitir. */
  entregadorHint?: {
    id?: string | null
    nome?: string | null
    telefone?: string | null
  } | null
  /** Ao abrir detalhes (step 4), seleciona esta aba — ex.: pagamentos antes de finalizar. */
  abaDetalhesInicial?: AbaDetalhesPedido
  /**
   * Canal escolhido no EscolhaTipoPedidoModal.
   * balcao: step inicial = Informações; entrega: step inicial = Produtos.
   */
  tipoInicioPedido?: 'balcao' | 'entrega'
  /** Cliente já escolhido no Flow — preenche telefone e vínculo na etapa Informações. */
  clienteInicial?: Cliente | null
  /** Telefone da conversa quando ainda não há cadastro. */
  telefoneInicial?: string
  /**
   * Ao fechar (voltar ao WhatsApp), guarda o lançamento em cache da conversa
   * em vez de apagar o pedido.
   */
  preservarRascunhoAoFechar?: boolean
  /** Chave do rascunho (id da conversa WhatsApp). */
  chaveRascunho?: string
}
