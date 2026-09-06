import type {
  CriarPedidoDeliveryInputDTO,
  CriarPedidoDeliveryPayload,
  CriarPedidoDeliveryResultDTO,
} from '@/src/application/dto/CriarPedidoDeliveryDTO'
import type { CriarPedidoDeliveryApiRequest } from '@/src/application/dto/api/pedidoDeliveryApi'
import { buildCriarPedidoDeliveryPayload } from '@/src/application/mappers/CriarPedidoDeliveryPayloadMapper'
import { parsePedidoDeliveryApiResponse } from '@/src/application/mappers/PedidoDeliveryApiNormalizer'
import {
  buildConfirmarCobrancasPendentesPedidoDeliveryPatch,
  cobrancasPatchTemOperacao,
  extrairIdsCobrancasPendentesPedidoDelivery,
} from '@/src/application/mappers/CobrancaPedidoDeliveryPayloadMapper'
import {
  buildFinalizarCreateOverrideTaxaPatch,
  extrairTaxaEntregaAtivaPedidoDelivery,
} from '@/src/application/mappers/TaxaPedidoDeliveryPayloadMapper'
import { atualizarCobrancasPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarCobrancasPedidoDeliveryUseCase'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'
import {
  resolverModoTaxaEntregaOverride,
  taxaEntregaIdParaPatch,
} from '@/src/shared/constants/taxaEntregaPedido'

export type CriarPedidoDeliveryMutateFn = (payload: CriarPedidoDeliveryPayload) => Promise<unknown>

const MOTIVO_CANCELAMENTO_LANCAMENTO =
  'Falha ao concluir o lançamento do pedido.'

/** Homolog/versões antigas validam cobrança antes de somar taxas — adiar PATCH evita 400. */
function deveOmitirCobrancasNoPostCreate(
  payload: CriarPedidoDeliveryApiRequest,
  jaPago: boolean
): boolean {
  if (!payload.cobrancas?.length) return false
  if (jaPago) return true
  return Boolean(payload.taxas?.length)
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
    const overrideTaxa =
      input.pedidoComEntrega && resolverModoTaxaEntregaOverride(input.taxaEntregaId) !== 'automatica'

    if (overrideTaxa && !token) {
      throw new Error('Sessão inválida para ajustar a taxa. Faça login novamente.')
    }
    const omitirCobrancasNoPost =
      overrideTaxa || deveOmitirCobrancasNoPostCreate(payload, jaPago)

    const createPayload: CriarPedidoDeliveryApiRequest = omitirCobrancasNoPost
      ? { ...payload, cobrancas: undefined }
      : payload

    const resultado = await mutate(createPayload)
    const pedidoId = parsePedidoDeliveryApiResponse(resultado)

    if (overrideTaxa && !pedidoId) {
      throw new Error(
        'Pedido criado sem identificador. Verifique o quadro e cancele se o lançamento ficou incompleto.'
      )
    }

    const precisaPosCreate =
      Boolean(token && pedidoId) &&
      (overrideTaxa || (omitirCobrancasNoPost && input.pagamentos.length > 0))

    if (!precisaPosCreate) {
      return resultado
    }

    try {
      if (overrideTaxa && token && pedidoId) {
        await this.aplicarOverrideTaxaECobrancas(pedidoId, token, input, jaPago)
        return resultado
      }

      if (omitirCobrancasNoPost && token && pedidoId && input.pagamentos.length > 0) {
        const fluxoPagamentoEntrega: FluxoPagamentoEntrega = input.entregaComCobrancaPeloEntregador
          ? 'cobrar_entregador'
          : 'ja_pago'
        await this.cobrancasUseCase.execute(
          pedidoId,
          token,
          input.pagamentos,
          fluxoPagamentoEntrega
        )
      }

      return resultado
    } catch (error) {
      if (pedidoId && token) {
        const cancelou = await this.cancelarPedidoCriado(pedidoId, token)
        if (!cancelou) {
          throw new Error(
            `${mensagemErro(error)} O pedido pode ter ficado no quadro — cancele manualmente.`
          )
        }
      }
      throw new Error(`${mensagemErro(error)} O pedido não foi lançado.`)
    }
  }

  private async aplicarOverrideTaxaECobrancas(
    pedidoId: string,
    token: string,
    input: CriarPedidoDeliveryInputDTO,
    jaPago: boolean
  ): Promise<void> {
    const pedido = await this.repo.buscarPedidoDelivery(pedidoId, token)
    const { taxaId: taxaAtualId } = extrairTaxaEntregaAtivaPedidoDelivery(pedido)
    const fluxoPagamentoEntrega: FluxoPagamentoEntrega = input.entregaComCobrancaPeloEntregador
      ? 'cobrar_entregador'
      : 'ja_pago'

    const { patch, mudou } = buildFinalizarCreateOverrideTaxaPatch({
      taxaAtualId,
      taxaSelecionadaId: taxaEntregaIdParaPatch(input.taxaEntregaId),
      pagamentos: input.pagamentos,
      fluxoPagamentoEntrega,
    })

    if (mudou) {
      await this.repo.patchPedidoDelivery(
        pedidoId,
        token,
        patch as unknown as Record<string, unknown>
      )
    }

    if (!jaPago || input.pagamentos.length === 0) return

    const pedidoApos = await this.repo.buscarPedidoDelivery(pedidoId, token)
    const pendentes = extrairIdsCobrancasPendentesPedidoDelivery(pedidoApos)
    const confirmPatch = buildConfirmarCobrancasPendentesPedidoDeliveryPatch(pendentes)
    if (cobrancasPatchTemOperacao(confirmPatch)) {
      await this.repo.patchPedidoDelivery(
        pedidoId,
        token,
        confirmPatch as unknown as Record<string, unknown>
      )
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
