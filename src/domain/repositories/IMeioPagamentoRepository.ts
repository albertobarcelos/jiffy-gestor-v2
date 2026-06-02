import { MeioPagamento } from '../entities/MeioPagamento'

export interface BuscarMeiosPagamentosParams {
  limit: number
  offset: number
  q?: string
  ativo?: boolean | null
}

export type TipoParcelamento = 'jurosVendedor' | 'jurosCliente'

export interface CriarMeioPagamentoDTO {
  nome: string
  tefAtivo?: boolean
  formaPagamentoFiscal?: string
  ativo?: boolean
  isParcelavel?: boolean
  tipoParcelamento?: TipoParcelamento
}

export interface AtualizarMeioPagamentoDTO {
  nome?: string
  tefAtivo?: boolean
  formaPagamentoFiscal?: string
  ativo?: boolean
  isParcelavel?: boolean
  tipoParcelamento?: TipoParcelamento
}

/**
 * Interface do repositório de meios de pagamento
 */
export interface IMeioPagamentoRepository {
  buscarMeiosPagamentos(params: BuscarMeiosPagamentosParams): Promise<{
    meiosPagamento: MeioPagamento[]
    total: number
  }>
  buscarMeioPagamentoPorId(id: string): Promise<MeioPagamento | null>
  criarMeioPagamento(data: CriarMeioPagamentoDTO): Promise<MeioPagamento>
  atualizarMeioPagamento(id: string, data: AtualizarMeioPagamentoDTO): Promise<MeioPagamento>
  deletarMeioPagamento(id: string): Promise<void>
}

