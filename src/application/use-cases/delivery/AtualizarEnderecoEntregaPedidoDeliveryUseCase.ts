import { buildUpdateEnderecoEntregaPedidoPayload } from '@/src/application/mappers/ContextoEntregaDeliveryMapper'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export type AtualizarEnderecoEntregaPedidoInput = {
  pedidoId: string
  token: string
  enderecoDeliveryId?: string | null
  enderecoManual?: {
    tipoEtiqueta?: string | null
    endereco: {
      rua: string
      numero: string
      bairro: string
      cidade?: string
      estado?: string
      cep?: string
      complemento?: string
    }
  } | null
}

/**
 * Atualiza o snapshot de endereço do pedido delivery (antes de `EM_ROTA`).
 * Use `enderecoDeliveryId` para trocar por morada salva ou `enderecoManual` para correção pontual.
 */
export class AtualizarEnderecoEntregaPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(input: AtualizarEnderecoEntregaPedidoInput): Promise<void> {
    const body = buildUpdateEnderecoEntregaPedidoPayload({
      enderecoDeliveryId: input.enderecoDeliveryId,
      enderecoManual: input.enderecoManual,
    })

    await this.repo.patchPedidoDelivery(input.pedidoId, input.token, body)
  }
}

export const atualizarEnderecoEntregaPedidoDeliveryUseCase =
  new AtualizarEnderecoEntregaPedidoDeliveryUseCase()
