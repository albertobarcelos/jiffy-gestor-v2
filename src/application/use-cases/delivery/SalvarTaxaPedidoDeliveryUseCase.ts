import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'
import {
  buildSalvarTaxaPedidoDeliveryPatch,
  extrairCobrancasPendentesNaEntregaPedidoDelivery,
  pedidoDeliveryEstaPago,
} from '@/src/application/mappers/TaxaPedidoDeliveryPayloadMapper'

export interface SalvarTaxaPedidoDeliveryInput {
  pedidoId: string
  token: string
  /** `taxaId` do catálogo atualmente aplicada (null quando não há taxa). */
  taxaAtualId: string | null
  /** Valor da taxa atual (0 quando não há taxa). */
  taxaAtualValor: number
  /** `taxaId` do catálogo escolhida (null = remover/sem taxa). */
  taxaSelecionadaId: string | null
  /** Valor da taxa escolhida (0 quando "sem taxa"). */
  taxaSelecionadaValor: number
}

export interface SalvarTaxaPedidoDeliveryResult {
  atualizado: boolean
  pedido: Record<string, unknown>
}

/**
 * Salva a taxa de entrega de um pedido delivery (independente do entregador) e,
 * quando há cobrança pendente `na_entrega`, reemite-a com o valor ajustado.
 *
 * Regras:
 * - Pedido já pago → bloqueia (não altera/adiciona taxa).
 * - Taxa atual não identificada no catálogo (sem `taxaId`) mas com valor → bloqueia,
 *   pois não há como removê-la com segurança.
 * - Mais de uma cobrança pendente → bloqueia (ajuste manual via fluxo de pagamento).
 */
export class SalvarTaxaPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(input: SalvarTaxaPedidoDeliveryInput): Promise<SalvarTaxaPedidoDeliveryResult> {
    const taxaAtual = input.taxaAtualId?.trim() || null
    const taxaSelecionada = input.taxaSelecionadaId?.trim() || null

    const pedido = await this.repo.buscarPedidoDelivery(input.pedidoId, input.token)

    if (pedidoDeliveryEstaPago(pedido)) {
      throw new Error('Pedido já pago: não é possível alterar ou adicionar a taxa.')
    }

    if (taxaAtual === taxaSelecionada) {
      return { atualizado: false, pedido }
    }

    if (!taxaAtual && input.taxaAtualValor > 0) {
      throw new Error(
        'Não foi possível identificar a taxa atual deste pedido. Ajuste pela edição do pedido.'
      )
    }

    const cobrancasPendentesNaEntrega = extrairCobrancasPendentesNaEntregaPedidoDelivery(pedido)
    if (cobrancasPendentesNaEntrega.length > 1) {
      throw new Error(
        'Pedido com mais de uma cobrança pendente. Ajuste o pagamento antes de alterar a taxa.'
      )
    }

    const { patch, mudou } = buildSalvarTaxaPedidoDeliveryPatch({
      taxaAtualId: taxaAtual,
      taxaAtualValor: input.taxaAtualValor,
      taxaSelecionadaId: taxaSelecionada,
      taxaSelecionadaValor: input.taxaSelecionadaValor,
      cobrancasPendentesNaEntrega,
    })

    if (!mudou) {
      return { atualizado: false, pedido }
    }

    const novaCobranca = patch.cobrancas?.add?.[0]
    if (novaCobranca && novaCobranca.valor <= 0) {
      throw new Error('Valor de pagamento inválido após alterar a taxa. Revise o pagamento.')
    }

    await this.repo.patchPedidoDelivery(
      input.pedidoId,
      input.token,
      patch as unknown as Record<string, unknown>
    )

    const pedidoAtualizado = await this.repo.buscarPedidoDelivery(input.pedidoId, input.token)
    return { atualizado: true, pedido: pedidoAtualizado }
  }
}

export const salvarTaxaPedidoDeliveryUseCase = new SalvarTaxaPedidoDeliveryUseCase()
