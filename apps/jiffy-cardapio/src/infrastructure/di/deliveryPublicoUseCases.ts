import { AtualizarNomeClienteDeliveryPublicoUseCase } from '@/src/application/use-cases/delivery-publico/AtualizarNomeClienteDeliveryPublicoUseCase'
import { BuscarClienteDeliveryPublicoUseCase } from '@/src/application/use-cases/delivery-publico/BuscarClienteDeliveryPublicoUseCase'
import { CotarPedidoPublicoUseCase } from '@/src/application/use-cases/delivery-publico/CotarPedidoPublicoUseCase'
import { EnviarPedidoPublicoUseCase } from '@/src/application/use-cases/delivery-publico/EnviarPedidoPublicoUseCase'
import { GarantirEnderecoEntregaPublicoUseCase } from '@/src/application/use-cases/delivery-publico/GarantirEnderecoEntregaPublicoUseCase'
import { ListarMeiosPagamentoPublicoUseCase } from '@/src/application/use-cases/delivery-publico/ListarMeiosPagamentoPublicoUseCase'
import { ObterCatalogoPublicoUseCase } from '@/src/application/use-cases/delivery-publico/ObterCatalogoPublicoUseCase'
import { RemoverEnderecoClienteDeliveryPublicoUseCase } from '@/src/application/use-cases/delivery-publico/RemoverEnderecoClienteDeliveryPublicoUseCase'
import {
  publicDeliveryCatalogoAdapter,
  publicDeliveryClienteAdapter,
  publicDeliveryCotacaoAdapter,
  publicDeliveryMeiosPagamentoAdapter,
  publicDeliveryPedidoAdapter,
} from '@/src/infrastructure/api/adapters/PublicDeliveryApiAdapter'

/** Composition root do delivery público — use cases com ports HTTP. */

export const garantirEnderecoEntregaPublicoUseCase =
  new GarantirEnderecoEntregaPublicoUseCase(publicDeliveryClienteAdapter)

export const cotarPedidoPublicoUseCase = new CotarPedidoPublicoUseCase(
  publicDeliveryCotacaoAdapter,
  garantirEnderecoEntregaPublicoUseCase
)

export const enviarPedidoPublicoUseCase = new EnviarPedidoPublicoUseCase(
  publicDeliveryPedidoAdapter,
  publicDeliveryClienteAdapter,
  garantirEnderecoEntregaPublicoUseCase
)

export const buscarClienteDeliveryPublicoUseCase =
  new BuscarClienteDeliveryPublicoUseCase(publicDeliveryClienteAdapter)

export const atualizarNomeClienteDeliveryPublicoUseCase =
  new AtualizarNomeClienteDeliveryPublicoUseCase(publicDeliveryClienteAdapter)

export const removerEnderecoClienteDeliveryPublicoUseCase =
  new RemoverEnderecoClienteDeliveryPublicoUseCase(publicDeliveryClienteAdapter)

export const obterCatalogoPublicoUseCase = new ObterCatalogoPublicoUseCase(
  publicDeliveryCatalogoAdapter
)

export const listarMeiosPagamentoPublicoUseCase =
  new ListarMeiosPagamentoPublicoUseCase(publicDeliveryMeiosPagamentoAdapter)
