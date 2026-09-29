import type { CaixaEstacaoAtualDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  mapOperacaoCaixaEstacaoToDTO,
  mapOperacaoCaixaEstacaoToEntity,
} from '@/src/application/mappers/caixa-estacao/OperacaoCaixaEstacaoMapper'

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
  const entity = mapOperacaoCaixaEstacaoToEntity(body)
  if (!entity) {
    return { aberta: false, operacao: null }
  }
  const operacao = mapOperacaoCaixaEstacaoToDTO(entity)
  if (!entity.isAberta()) {
    return { aberta: false, operacao }
  }
  return { aberta: true, operacao }
}
