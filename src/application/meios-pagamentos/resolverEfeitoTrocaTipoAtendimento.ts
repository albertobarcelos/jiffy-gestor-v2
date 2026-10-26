import { deveLimparPagamentosAoTrocarTipo } from '@/src/domain/policies/pedido/MeiosPagamentoNovoPedidoPolicy'
import type { TipoAtendimentoDelivery } from '@/src/domain/types/vendaDetalhe'

export function resolverEfeitoTrocaTipoAtendimento(input: {
  tipoAtual: TipoAtendimentoDelivery
  tipoNovo: TipoAtendimentoDelivery
  pedidoExistente: boolean
}): { trocou: boolean; limparPagamentos: boolean; limparEnderecoTaxa: boolean } {
  const trocou = input.tipoAtual !== input.tipoNovo
  return {
    trocou,
    limparPagamentos: deveLimparPagamentosAoTrocarTipo(input),
    limparEnderecoTaxa: trocou && input.tipoNovo === 'retirada',
  }
}
