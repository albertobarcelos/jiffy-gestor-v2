import type { AbaDetalhesPedido } from '../../types'

export type NovoPedidoShellProps = {
  internalDialogOpen: boolean
  handleDialogOpenChange: (open: boolean) => void
  handlePedidoPainelExited: () => void
  estaNoPassoProdutos: boolean
  modoVisualizacao: boolean | undefined
  /** Edição de produtos de um pedido delivery existente (sem fluxo de criação). */
  modoEdicaoProdutos: boolean
  /** Salvando o diff de produtos (PATCH delivery). */
  salvandoProdutos: boolean
  /** Salva as alterações de produtos (diff add/remove). */
  onSalvarProdutos: () => void | Promise<void>
  nomeUsuario: string
  currentStep: 1 | 2 | 3 | 4
  isLoadingVenda: boolean
  abaDetalhesPedido: AbaDetalhesPedido
  setAbaDetalhesPedido: (aba: AbaDetalhesPedido) => void
  podeExibirAbaNotaFiscal: boolean
  podeExibirAbaDadosEntrega: boolean
  tipoInicioPedido: 'balcao' | 'entrega'
  createPending: boolean
  canSubmit: () => boolean
  onSubmit: () => void | Promise<void>
  onNextStep: () => void
  onPreviousStep: () => void
  onClose: () => void
  onSuccess: () => void
  podeExibirCancelarVendaGestor: boolean
  podeExibirCancelarNotaFiscal: boolean
  isSavingPagamentoEntrega: boolean
  onSalvarPagamentoEntrega: () => void | Promise<void>
}
