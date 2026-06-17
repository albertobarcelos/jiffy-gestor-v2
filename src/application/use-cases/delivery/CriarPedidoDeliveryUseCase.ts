import type {
  CriarPedidoDeliveryInputDTO,
  CriarPedidoDeliveryPayload,
  CriarPedidoDeliveryResultDTO,
} from '@/src/application/dto/CriarPedidoDeliveryDTO'
import type { CriarPedidoDeliveryApiRequest } from '@/src/application/dto/api/pedidoDeliveryApi'
import { buildCriarPedidoDeliveryPayload } from '@/src/application/mappers/CriarPedidoDeliveryPayloadMapper'
import { parsePedidoDeliveryApiResponse } from '@/src/application/mappers/PedidoDeliveryApiNormalizer'
import { atualizarCobrancasPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarCobrancasPedidoDeliveryUseCase'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'

export type CriarPedidoDeliveryMutateFn = (payload: CriarPedidoDeliveryPayload) => Promise<unknown>

/** Homolog/versões antigas validam cobrança antes de somar taxas — adiar PATCH evita 400. */
function deveOmitirCobrancasNoPostCreate(
  payload: CriarPedidoDeliveryApiRequest,
  jaPago: boolean
): boolean {
  if (!payload.cobrancas?.length) return false
  if (jaPago) return true
  return Boolean(payload.taxas?.length)
}

export class CriarPedidoDeliveryUseCase {
  buildPayload(input: CriarPedidoDeliveryInputDTO): CriarPedidoDeliveryResultDTO {
    const payload = buildCriarPedidoDeliveryPayload(input)
    return { payload }
  }

  async execute(
    input: CriarPedidoDeliveryInputDTO,
    mutate: CriarPedidoDeliveryMutateFn,
    token?: string
  ): Promise<unknown> {
    const { payload } = this.buildPayload(input)
    const jaPago = !input.entregaComCobrancaPeloEntregador
    const omitirCobrancasNoPost = deveOmitirCobrancasNoPostCreate(payload, jaPago)

    const createPayload: CriarPedidoDeliveryApiRequest = omitirCobrancasNoPost
      ? { ...payload, cobrancas: undefined }
      : payload

    const resultado = await mutate(createPayload)

    if (omitirCobrancasNoPost && token && input.pagamentos.length > 0) {
      const pedidoId = parsePedidoDeliveryApiResponse(resultado)
      if (pedidoId) {
        const fluxoPagamentoEntrega: FluxoPagamentoEntrega = input.entregaComCobrancaPeloEntregador
          ? 'cobrar_entregador'
          : 'ja_pago'
        await atualizarCobrancasPedidoDeliveryUseCase.execute(
          pedidoId,
          token,
          input.pagamentos,
          fluxoPagamentoEntrega
        )
      }
    }

    return resultado
  }
}

export { parsePedidoDeliveryApiResponse as extrairIdPedidoDeliveryCriado }
