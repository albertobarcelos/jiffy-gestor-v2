import type { TipoEntregaDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import {
  buildAlterarTipoEntregaPedidoDeliveryPatch,
  type EnderecoManualAlterarTipoEntregaInput,
} from '@/src/application/mappers/TipoEntregaPedidoDeliveryPayloadMapper'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export type AlterarTipoEntregaPedidoDeliveryInput = {
  pedidoId: string
  token: string
  tipoAtual: TipoEntregaDeliveryApi
  tipoSelecionado: TipoEntregaDeliveryApi
  enderecoDeliveryId?: string | null
  enderecoManual?: EnderecoManualAlterarTipoEntregaInput | null
}

/**
 * Troca o tipo de atendimento (`entrega` ↔ `retirada`) de um pedido delivery já criado.
 * Em retirada→entrega exige endereço; em entrega→retirada remove taxa ativa quando permitido.
 */
export class AlterarTipoEntregaPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(input: AlterarTipoEntregaPedidoDeliveryInput): Promise<Record<string, unknown>> {
    if (input.tipoAtual === input.tipoSelecionado) {
      throw new Error('Selecione um tipo de atendimento diferente do atual.')
    }

    const pedido = await this.repo.buscarPedidoDelivery(input.pedidoId, input.token)
    const patch = buildAlterarTipoEntregaPedidoDeliveryPatch({
      tipoSelecionado: input.tipoSelecionado,
      pedido,
      enderecoDeliveryId: input.enderecoDeliveryId,
      enderecoManual: input.enderecoManual,
    })

    await this.repo.patchPedidoDelivery(
      input.pedidoId,
      input.token,
      patch as unknown as Record<string, unknown>
    )

    return this.repo.buscarPedidoDelivery(input.pedidoId, input.token)
  }
}

export const alterarTipoEntregaPedidoDeliveryUseCase = new AlterarTipoEntregaPedidoDeliveryUseCase()
