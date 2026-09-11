import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizarClienteDeliveryPublico } from '@/src/application/mappers/ClienteDeliveryPublicoMapper'
import type { IClienteDeliveryPublicoPort } from '@/src/application/ports/delivery-publico'

export type RemoverEnderecoClienteDeliveryPublicoResult =
  | { ok: true; cliente: ClienteDeliveryPublicoDTO }
  | { ok: false; error: string }

export class RemoverEnderecoClienteDeliveryPublicoUseCase {
  constructor(private readonly clientePort: IClienteDeliveryPublicoPort) {}

  async execute(input: {
    telefone: string
    enderecoId: string
  }): Promise<RemoverEnderecoClienteDeliveryPublicoResult> {
    const tel = input.telefone.replace(/\D/g, '')
    const id = input.enderecoId.trim()

    if (tel.length < 8) {
      return { ok: false, error: 'Informe um telefone válido' }
    }
    if (!id) {
      return { ok: false, error: 'Endereço inválido' }
    }

    try {
      const atualizadoRaw = await this.clientePort.atualizar(tel, {
        enderecos: { delete: [id] },
      })
      const cliente = normalizarClienteDeliveryPublico(atualizadoRaw)
      if (!cliente) {
        return { ok: false, error: 'Não foi possível remover o endereço' }
      }
      return { ok: true, cliente }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Não foi possível remover o endereço',
      }
    }
  }
}
