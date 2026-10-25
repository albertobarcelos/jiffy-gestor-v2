import type { CriarMeioPagamentoDTO } from '@/src/domain/repositories/IMeioPagamentoRepository'

export function montarCorpoCriarMeioPagamento(
  data: CriarMeioPagamentoDTO
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    nome: data.nome,
    tefAtivo: data.tefAtivo !== undefined ? data.tefAtivo : true,
    ativoEntregaDelivery: data.ativoEntregaDelivery ?? false,
    ativoRetiradaDelivery: data.ativoRetiradaDelivery ?? false,
    formaPagamentoFiscal: data.formaPagamentoFiscal || 'Dinheiro',
    ativo: data.ativo !== undefined ? data.ativo : true,
    isParcelavel: data.isParcelavel !== undefined ? data.isParcelavel : false,
  }
  if (data.tipoParcelamento) body.tipoParcelamento = data.tipoParcelamento
  return body
}
