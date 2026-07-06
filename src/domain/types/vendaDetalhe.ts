/** Tipos de detalhe de venda/pedido gestor (contrato domain ↔ application). */

export type OrigemVenda = 'GESTOR' | 'IFOOD' | 'RAPPI' | 'OUTROS'

export type FluxoPagamentoEntrega = 'cobrar_entregador' | 'ja_pago'

export type TipoAtendimentoDelivery = 'entrega' | 'retirada'

export type AbaDetalhesPedido =
  | 'infoPedido'
  | 'dadosEntrega'
  | 'listaProdutos'
  | 'pagamentos'
  | 'notaFiscal'

export interface EnderecoEntregaDetalhe {
  cep?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  complemento?: string | null
  referencia?: string | null
}

/** Taxa de entrega resolvida no detalhe (snapshot da venda ou GET `/api/taxas/{id}`). */
export interface TaxaEntregaDetalhe {
  taxaId?: string | null
  nome?: string | null
  valor?: number | null
}

/** Snapshot da entrega no modo detalhe (GET gestor). */
export interface DetalhesEntregaPedido {
  entregadorId?: string | null
  /** Nome resolvido via usuário PDV (`/api/usuarios/{id}`), não usuário gestor. */
  entregadorNome?: string | null
  clienteNome?: string | null
  clienteCpfCnpj?: string | null
  clienteCelular?: string | null
  enderecoEntrega?: EnderecoEntregaDetalhe | null
  observacaoPedido?: string | null
  previsaoEntrega?: string | null
  dataInicioPreparo?: string | null
  dataPronto?: string | null
  dataSaidaEntrega?: string | null
  /** Troco persistido na venda (`troco` na raiz do GET). */
  trocoApi?: number | null
  taxaEntrega?: TaxaEntregaDetalhe | null
}

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
  /** Etapa operacional delivery (PENDENTE, EM_PREPARO, PRONTO, EM_ROTA, …). */
  statusEtapaOperacional?: string | null
}

export interface ResumoFinanceiroDetalhes {
  totalItensLancados: number
  totalTaxasEntrega: number
  totalItensCancelados: number
  totalDosItens: number
  totalDescontosConta: number
  totalAcrescimosConta: number
}

/** Trecho retornado pela API quando `incluirFiscal=true` */
export interface ResumoFiscalVenda {
  status?: string | null
  numero?: number | null
  retornoSefaz?: string | null
  codigoRetorno?: string | null
  serie?: string | null
  dataEmissao?: string | null
  modelo?: number | null
  chaveFiscal?: string | null
  dataCriacao?: string | null
  dataUltimaModificacao?: string | null
  /** Id do documento fiscal — mesmo usado em GET `/api/nfe/[id]` */
  documentoFiscalId?: string | null
}

export type TabelaOrigemVenda = 'venda' | 'venda_gestor'

export type CanalAberturaPedido = 'balcao' | 'entrega'

/** Morada de entrega selecionada no formulário (independente do hook de UI). */
export interface MoradaEntregaSelecionada {
  id: string
  telefone: string
  tipoEtiqueta?: string
  nomeMorada?: string
  endereco?: {
    cep?: string
    rua?: string
    numero?: string
    bairro?: string
    cidade?: string
    estado?: string
    complemento?: string
    referencia?: string
  }
}
