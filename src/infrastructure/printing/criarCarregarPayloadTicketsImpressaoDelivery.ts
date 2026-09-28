import { criarCarregarPayloadTicketsImpressaoDelivery } from '@/src/application/delivery/carregarPayloadTicketsImpressaoDelivery'
import { fetchInstrucoesImpressaoPedido } from '@/src/infrastructure/api/fetchInstrucoesImpressaoPedido'
import { fetchModosImpressaoDaEstacaoPorIds } from '@/src/infrastructure/api/fetchModosImpressaoDaEstacaoPorIds'
import { fetchPedidoDeliveryDetalhe } from '@/src/infrastructure/api/fetchPedidoDeliveryDetalhe'
import {
  lembrarNomeMeioPagamento,
  obterNomeMeioPagamentoCache,
  snapshotNomesMeiosPagamentoCache,
} from '@/src/infrastructure/api/meiosPagamentoNomeCache'
import { buscarMapeamentosEstacao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { vendaDetalheReadRepository } from '@/src/infrastructure/api/repositories/VendaDetalheReadRepository'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'

export const carregarPayloadTicketsImpressaoDelivery = criarCarregarPayloadTicketsImpressaoDelivery({
  obterEstacaoId: getEstacaoImpressaoId,
  buscarInstrucoes: fetchInstrucoesImpressaoPedido,
  buscarPedido: fetchPedidoDeliveryDetalhe,
  buscarMapeamentos: buscarMapeamentosEstacao,
  buscarModosPorIds: fetchModosImpressaoDaEstacaoPorIds,
  snapshotNomesMeios: snapshotNomesMeiosPagamentoCache,
  lembrarNomeMeio: lembrarNomeMeioPagamento,
  obterNomeMeio: obterNomeMeioPagamentoCache,
  fetchMeioPagamento: (id, token) => vendaDetalheReadRepository.fetchMeioPagamento(id, token),
})
