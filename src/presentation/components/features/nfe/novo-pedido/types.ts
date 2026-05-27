'use client'

import type { MoradaTelefone } from '@/src/presentation/hooks/useMoradaTelefone'

export interface NovoPedidoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Chamado após o painel terminar a transição de saída (permite desmontar o pai sem cortar o slide) */
  onAfterClose?: () => void
  // Props opcionais para visualizar venda existente
  vendaId?: string // ID da venda para carregar e visualizar
  modoVisualizacao?: boolean // Se true, abre direto na step 4 em modo apenas visualização
  /** GET gestor vs PDV (`/api/vendas/gestor/:id` vs `/api/vendas/:id`); com `incluirFiscal=true` no carregamento */
  tabelaOrigemVenda?: 'venda' | 'venda_gestor'
  /**
   * `statusFiscal` do GET vendas unificado (Kanban). No PDV o GET de detalhe não repete esse campo;
   * use-o para saber se a nota está EMITIDA antes/sem depender só do `resumoFiscal`.
   */
  statusFiscalUnificado?: string | null
  /**
   * Tipo de pedido escolhido no EscolhaTipoPedidoModal.
   * 'balcao' (padrão): step inicial = Informações.
   * 'entrega': step inicial = Produtos (step 1 é pulado); tipoVenda enviado como 'entrega'.
   */
  tipoInicioPedido?: 'balcao' | 'entrega'
}

/** Trecho retornado pela API quando `incluirFiscal=true` */
export interface ResumoFiscalVenda {
  status?: string | null
  numero?: number | null
  retornoSefaz?: string | null
  serie?: string | null
  dataEmissao?: string | null
  modelo?: number | null
  chaveFiscal?: string | null
  dataCriacao?: string | null
  dataUltimaModificacao?: string | null
  /** Id do documento fiscal — mesmo usado em GET `/api/nfe/[id]` (Kanban “Ver NFCe/NFe”) */
  documentoFiscalId?: string | null
}

export interface ComplementoSelecionado {
  id: string
  grupoId: string
  nome: string
  valor: number
  quantidade: number
  tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
}

export interface ProdutoSelecionado {
  produtoId: string
  nome: string
  quantidade: number
  valorUnitario: number
  complementos: ComplementoSelecionado[]
  tipoDesconto?: 'fixo' | 'porcentagem' | null
  valorDesconto?: number | null
  tipoAcrescimo?: 'fixo' | 'porcentagem' | null
  valorAcrescimo?: number | null
  valorFinal?: number | null
  lancadoPorId?: string
  removido?: boolean
  removidoPorId?: string
  dataLancamento?: string
  dataRemocao?: string
  ncm?: string
}

export interface PagamentoSelecionado {
  id?: string
  meioPagamentoId: string
  valor: number
  cobrarNaEntrega?: boolean
  naoEfetivo?: boolean
  realizadoPorId?: string
  cancelado?: boolean
  canceladoPorId?: string
  dataCriacao?: string
  dataCancelamento?: string
  isTefUsed?: boolean
  isTefConfirmed?: boolean
  tefIdentifier?: string
  tefAdquirente?: string
  cnpjAdquirente?: string
  codigoAutorizacao?: string
  tipoIntegracao?: string
  bandeiraCartao?: string
}

export type OrigemVenda = 'GESTOR' | 'IFOOD' | 'RAPPI' | 'OUTROS'
export type StatusVenda = 'ABERTA' | 'FINALIZADA' | 'PENDENTE_EMISSAO'
export type FluxoPagamentoEntrega = 'cobrar_entregador' | 'ja_pago'
export type TipoAtendimentoDelivery = 'entrega' | 'retirada'
export type AbaDetalhesPedido = 'infoPedido' | 'listaProdutos' | 'pagamentos' | 'notaFiscal'

export interface UsuarioPdvEntregadorOption {
  id: string
  nome: string
  telefone?: string
}

export interface DetalhesPedidoMeta {
  numeroVenda?: number | null
  codigoVenda?: string | null
  tipoVenda?: string | null
  numeroMesa?: string | number | null
  statusMesa?: string | null
  abertoPorId?: string | null
  ultimoResponsavelId?: string | null
  canceladoPorId?: string | null
  codigoTerminal?: string | null
  terminalId?: string | null
  identificacao?: string | null
  solicitarEmissaoFiscal?: boolean | null
  dataCriacao?: string | null
  dataFinalizacao?: string | null
  dataCancelamento?: string | null
  dataUltimaModificacao?: string | null
  dataUltimoProdutoLancado?: string | null
}

export interface ResumoFinanceiroDetalhes {
  totalItensLancados: number
  totalItensCancelados: number
  totalDosItens: number
  totalDescontosConta: number
  totalAcrescimosConta: number
}

export type NovoPedidoClienteEntregaVinculado = {
  id: string
  nome: string
  cpf?: string | null
  cnpj?: string | null
} | null

export type NovoPedidoMoradaEntrega = MoradaTelefone | null
