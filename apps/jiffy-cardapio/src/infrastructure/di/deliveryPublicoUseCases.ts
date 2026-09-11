import { CotarPedidoPublicoUseCase } from '@/src/application/use-cases/delivery-publico/CotarPedidoPublicoUseCase'
import { EnviarPedidoPublicoUseCase } from '@/src/application/use-cases/delivery-publico/EnviarPedidoPublicoUseCase'
import { GarantirEnderecoEntregaPublicoUseCase } from '@/src/application/use-cases/delivery-publico/GarantirEnderecoEntregaPublicoUseCase'
import {
  publicDeliveryClienteAdapter,
  publicDeliveryCotacaoAdapter,
  publicDeliveryPedidoAdapter,
} from '@/src/infrastructure/api/adapters/PublicDeliveryApiAdapter'

/** Composition root do checkout público — use cases com ports HTTP. */

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
