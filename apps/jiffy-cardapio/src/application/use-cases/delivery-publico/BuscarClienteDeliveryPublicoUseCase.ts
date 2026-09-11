import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizarClienteDeliveryPublico } from '@/src/application/mappers/ClienteDeliveryPublicoMapper'
import type { IClienteDeliveryPublicoPort } from '@/src/application/ports/delivery-publico'

export type BuscarClienteDeliveryPublicoResult =
  | { ok: true; encontrado: false }
  | { ok: true; encontrado: true; cliente: ClienteDeliveryPublicoDTO }
  | { ok: false; error: string }

/**
 * Busca cliente delivery por telefone e normaliza o DTO.
 * Sem efeitos de UI — o hook decide loading/cache/debounce.
 */
export class BuscarClienteDeliveryPublicoUseCase {
  constructor(private readonly clientePort: IClienteDeliveryPublicoPort) {}

  async execute(telefone: string): Promise<BuscarClienteDeliveryPublicoResult> {
    const tel = telefone.replace(/\D/g, '')
    if (tel.length < 8) {
      return { ok: false, error: 'Informe um telefone válido' }
    }

    try {
      const raw = await this.clientePort.buscarPorTelefone(tel)
      if (!raw) {
        return { ok: true, encontrado: false }
      }

      const cliente = normalizarClienteDeliveryPublico(raw)
      if (!cliente) {
        return { ok: false, error: 'Resposta inválida ao buscar cliente' }
      }

      return { ok: true, encontrado: true, cliente }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar cadastro',
      }
    }
  }
}
