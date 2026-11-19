import type {
  FecharCaixaTerminalInput,
  FecharCaixaTerminalResult,
} from '@/src/application/dto/caixa-terminal/FecharCaixaTerminalDTO'
import type { MovimentacaoCaixaTerminalInput } from '@/src/application/dto/caixa-terminal/OperacaoCaixaTerminalDTO'

export type CaixaTerminalAtualGatewayResponse = {
  status: number
  body: unknown
}

/**
 * Porta de saída para operação de caixa do terminal PDV (BFF → upstream).
 */
export interface IOperacaoCaixaTerminalGateway {
  buscarAtual(
    terminalId: string,
    tipoRetorno?: 'resumido' | 'detalhado'
  ): Promise<CaixaTerminalAtualGatewayResponse>
  buscarPorId(
    operacaoCaixaId: string,
    tipoRetorno?: 'resumido' | 'detalhado'
  ): Promise<unknown>
  fechar(
    terminalId: string,
    input: FecharCaixaTerminalInput
  ): Promise<FecharCaixaTerminalResult>
  registrarSuprimento(
    terminalId: string,
    input: MovimentacaoCaixaTerminalInput
  ): Promise<unknown>
  registrarSangria(
    terminalId: string,
    input: MovimentacaoCaixaTerminalInput
  ): Promise<unknown>
  listarMovimentacoes(
    terminalId: string,
    tipo: 'sangrias' | 'suprimentos'
  ): Promise<unknown>
}
