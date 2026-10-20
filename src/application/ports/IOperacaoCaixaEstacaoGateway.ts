import type {
  FecharCaixaEstacaoInput,
  ListarOperacoesCaixaEstacaoInput,
  MovimentacaoCaixaEstacaoInput,
} from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'

/** Resposta bruta do GET current — use case interpreta 404 vs aberto. */
export type CaixaEstacaoAtualGatewayResponse = {
  status: number
  body: unknown
}

export type FecharCaixaEstacaoGatewayResult = {
  operacaoCaixaId?: string
}

/**
 * Porta de saída da aplicação para o módulo operacao-caixa-estacao (BFF → upstream).
 * @see docs/arquitetura-jiffy/2.domain/4.PORTS.md §2.2
 */
export interface IOperacaoCaixaEstacaoGateway {
  buscarAtual(estacaoGestorId: string): Promise<CaixaEstacaoAtualGatewayResponse>
  buscarPorId(operacaoCaixaId: string): Promise<unknown>
  registrarSuprimento(
    estacaoGestorId: string,
    input: MovimentacaoCaixaEstacaoInput
  ): Promise<unknown>
  registrarSangria(
    estacaoGestorId: string,
    input: MovimentacaoCaixaEstacaoInput
  ): Promise<unknown>
  fechar(
    estacaoGestorId: string,
    input: FecharCaixaEstacaoInput
  ): Promise<FecharCaixaEstacaoGatewayResult>
  listarOperacoes(input: ListarOperacoesCaixaEstacaoInput): Promise<unknown>
  listarMovimentacoes(
    estacaoGestorId: string,
    tipo: 'sangrias' | 'suprimentos'
  ): Promise<unknown>
}
