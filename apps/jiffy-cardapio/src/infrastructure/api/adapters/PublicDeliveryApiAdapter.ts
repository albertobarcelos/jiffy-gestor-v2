import type {
  ICatalogoPublicoPort,
  IClienteDeliveryPublicoPort,
  ICotacaoPedidoPublicoPort,
  IMeiosPagamentoPublicoPort,
  IPedidoPublicoPort,
} from '@/src/application/ports/delivery-publico'
import {
  atualizarClienteDeliveryPublico,
  buscarClienteDeliveryPublico,
  cotarPedidoPublico,
  criarClienteDeliveryPublico,
  criarPedidoPublico,
  fetchCatalogoPublico,
  fetchMeiosPagamentoPublicos,
} from '@/src/infrastructure/api/publicDeliveryApi'

/** Adapters HTTP que implementam os ports do delivery público. */

export const publicDeliveryClienteAdapter: IClienteDeliveryPublicoPort = {
  buscarPorTelefone: telefone => buscarClienteDeliveryPublico(telefone),
  criar: input => criarClienteDeliveryPublico(input),
  atualizar: (telefone, input) => atualizarClienteDeliveryPublico(telefone, input),
}

export const publicDeliveryCotacaoAdapter: ICotacaoPedidoPublicoPort = {
  cotar: input => cotarPedidoPublico(input),
}

export const publicDeliveryPedidoAdapter: IPedidoPublicoPort = {
  criar: input => criarPedidoPublico(input),
}

export const publicDeliveryCatalogoAdapter: ICatalogoPublicoPort = {
  buscarPorSlug: (slug, params) => fetchCatalogoPublico(slug, params),
}

export const publicDeliveryMeiosPagamentoAdapter: IMeiosPagamentoPublicoPort = {
  listarPorSlug: slug => fetchMeiosPagamentoPublicos(slug),
}
