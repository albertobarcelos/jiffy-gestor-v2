import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizarClienteDeliveryPublico } from '@/src/application/mappers/ClienteDeliveryPublicoMapper'
import type { IClienteDeliveryPublicoPort } from '@/src/application/ports/delivery-publico'

export type AtualizarNomeClienteDeliveryPublicoResult =
  | { ok: true; cliente: ClienteDeliveryPublicoDTO }
  | { ok: false; error: string }

export class AtualizarNomeClienteDeliveryPublicoUseCase {
  constructor(private readonly clientePort: IClienteDeliveryPublicoPort) {}

  async execute(input: {
    telefone: string
    nome: string
  }): Promise<AtualizarNomeClienteDeliveryPublicoResult> {
    const tel = input.telefone.replace(/\D/g, '')
    if (tel.length < 8) {
      return { ok: false, error: 'Informe um telefone válido' }
    }

    const nome = input.nome.trim()
    if (!nome) {
      return { ok: false, error: 'Informe o nome' }
    }

    try {
      const atualizadoRaw = await this.clientePort.atualizar(tel, { nome })
      const cliente = normalizarClienteDeliveryPublico(atualizadoRaw)
      if (!cliente) {
        return { ok: false, error: 'Não foi possível atualizar o nome' }
      }
      return { ok: true, cliente }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Não foi possível atualizar o nome',
      }
    }
  }
}
