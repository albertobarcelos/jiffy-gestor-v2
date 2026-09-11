import type {
  CriarPedidoDeliveryInputDTO,
  CriarPedidoDeliveryPayload,
  CriarPedidoDeliveryResultDTO,
} from '@/src/application/dto/CriarPedidoDeliveryDTO'
import type { CriarPedidoDeliveryApiRequest } from '@/src/application/dto/api/pedidoDeliveryApi'
import { buildCriarPedidoDeliveryPayload } from '@/src/application/mappers/CriarPedidoDeliveryPayloadMapper'
import { parsePedidoDeliveryApiResponse } from '@/src/application/mappers/PedidoDeliveryApiNormalizer'
import { atualizarCobrancasPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarCobrancasPedidoDeliveryUseCase'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'

export type CriarPedidoDeliveryMutateFn = (payload: CriarPedidoDeliveryPayload) => Promise<unknown>

const MOTIVO_CANCELAMENTO_LANCAMENTO =
  'Falha ao concluir o lançamento do pedido.'

/** Homolog/versões antigas validam cobrança antecipada no create — adiar PATCH evita 400. */
function deveOmitirCobrancasNoPostCreate(
  payload: CriarPedidoDeliveryApiRequest,
  jaPago: boolean
): boolean {
  if (!payload.cobrancas?.length) return false
  return jaPago
}

function mensagemErro(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message.trim()
    : 'Não foi possível concluir o pedido.'
}

export class CriarPedidoDeliveryUseCase {
  constructor(
    private readonly cobrancasUseCase = atualizarCobrancasPedidoDeliveryUseCase,
    private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository
  ) {}

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
    const pedidoId = parsePedidoDeliveryApiResponse(resultado)

    if (!omitirCobrancasNoPost || !token || !pedidoId || input.pagamentos.length === 0) {
      return resultado
    }

    try {
      const fluxoPagamentoEntrega: FluxoPagamentoEntrega = input.entregaComCobrancaPeloEntregador
        ? 'cobrar_entregador'
        : 'ja_pago'
      await this.cobrancasUseCase.execute(
        pedidoId,
        token,
        input.pagamentos,
        fluxoPagamentoEntrega
      )
      return resultado
    } catch (error) {
      const cancelou = await this.cancelarPedidoCriado(pedidoId, token)
      if (!cancelou) {
        throw new Error(
          `${mensagemErro(error)} O pedido pode ter ficado no quadro — cancele manualmente.`
        )
      }
      throw new Error(`${mensagemErro(error)} O pedido não foi lançado.`)
    }
  }

  private async cancelarPedidoCriado(pedidoId: string, token: string): Promise<boolean> {
    try {
      await this.repo.transicionarStatusPedidoDelivery(pedidoId, token, {
        toStatus: 'CANCELADO',
        motivoCancelamento: MOTIVO_CANCELAMENTO_LANCAMENTO,
      })
      return true
    } catch {
      return false
    }
  }
}

export { parsePedidoDeliveryApiResponse as extrairIdPedidoDeliveryCriado }
