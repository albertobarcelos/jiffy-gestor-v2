import type { CaixaEstacaoAtualDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { mapOperacaoCaixaEstacao } from '@/src/application/mappers/caixa-estacao/OperacaoCaixaEstacaoMapper'

/**
 * Interpreta a resposta do BFF (status HTTP + body) em um DTO tipado.
 * HTTP 404 = caixa sem operação aberta (semântica da API de homologação).
 */
export function interpretarCaixaEstacaoAtual(
  statusHttp: number,
  body: unknown
): CaixaEstacaoAtualDTO {
  if (statusHttp === 404) {
    return { aberta: false, operacao: null }
  }
  const operacao = mapOperacaoCaixaEstacao(body)
  if (!operacao || operacao.status === 'fechado') {
    return { aberta: false, operacao }
  }
  return { aberta: true, operacao }
}
