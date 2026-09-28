import { criarCarregarPayloadTicketsImpressaoDelivery } from '@/src/application/delivery/carregarPayloadTicketsImpressaoDelivery'
import { buscarMapeamentosEstacao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { fetchInstrucoesImpressaoPedido } from '@/src/infrastructure/api/fetchInstrucoesImpressaoPedido'
import { fetchModosImpressaoDaEstacaoPorIds } from '@/src/infrastructure/api/fetchModosImpressaoDaEstacaoPorIds'
import { fetchPedidoDeliveryDetalhe } from '@/src/infrastructure/api/fetchPedidoDeliveryDetalhe'
import {
  lembrarNomeMeioPagamento,
  obterNomeMeioPagamentoCache,
  snapshotNomesMeiosPagamentoCache,
} from '@/src/infrastructure/api/meiosPagamentoNomeCache'
import { vendaDetalheReadRepository } from '@/src/infrastructure/api/repositories/VendaDetalheReadRepository'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'

export const carregarPayloadTicketsImpressaoDelivery = criarCarregarPayloadTicketsImpressaoDelivery({
  fetchInstrucoesImpressaoPedido,
  fetchPedidoDeliveryDetalhe,
  buscarMapeamentosEstacao,
  fetchModosImpressaoDaEstacaoPorIds,
  getEstacaoImpressaoId,
  lembrarNomeMeioPagamento,
  obterNomeMeioPagamentoCache,
  snapshotNomesMeiosPagamentoCache,
  vendaDetalheReadRepository,
})
