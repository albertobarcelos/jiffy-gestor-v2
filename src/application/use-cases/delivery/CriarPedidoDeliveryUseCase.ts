import type {
  CriarPedidoDeliveryInputDTO,
  CriarPedidoDeliveryPayload,
  CriarPedidoDeliveryResultDTO,
} from '@/src/application/dto/CriarPedidoDeliveryDTO'
import { buildCriarPedidoDeliveryPayload } from '@/src/application/mappers/CriarPedidoDeliveryPayloadMapper'
import { parsePedidoDeliveryApiResponse } from '@/src/application/mappers/PedidoDeliveryApiNormalizer'

export type CriarPedidoDeliveryMutateFn = (payload: CriarPedidoDeliveryPayload) => Promise<unknown>

export class CriarPedidoDeliveryUseCase {
  buildPayload(input: CriarPedidoDeliveryInputDTO): CriarPedidoDeliveryResultDTO {
    const payload = buildCriarPedidoDeliveryPayload(input)
    return { payload }
  }

  async execute(
    input: CriarPedidoDeliveryInputDTO,
    mutate: CriarPedidoDeliveryMutateFn
  ): Promise<unknown> {
    const { payload } = this.buildPayload(input)
    return mutate(payload)
  }
}

export { parsePedidoDeliveryApiResponse as extrairIdPedidoDeliveryCriado }
