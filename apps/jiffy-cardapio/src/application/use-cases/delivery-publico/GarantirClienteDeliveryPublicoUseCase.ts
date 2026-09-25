import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizarClienteDeliveryPublico } from '@/src/application/mappers/ClienteDeliveryPublicoMapper'
import type { IClienteDeliveryPublicoPort } from '@/src/application/ports/delivery-publico'

export type GarantirClienteDeliveryPublicoInput = {
  telefone: string
  nome?: string | null
  clienteLookup: ClienteDeliveryPublicoDTO | null
}

/**
 * Garante cliente delivery persistido antes de cotação/pedido.
 *
 * Contrato backend (`POST /delivery/cotacao` e `POST /delivery/pedidos/publico`):
 * o telefone deve ser de um cliente já cadastrado. Cotação e pedido não criam
 * cadastro. O create fica em `POST /delivery/clientes`.
 */
export class GarantirClienteDeliveryPublicoUseCase {
  constructor(private readonly clientePort: IClienteDeliveryPublicoPort) {}

  async execute(
    input: GarantirClienteDeliveryPublicoInput
  ): Promise<ClienteDeliveryPublicoDTO> {
    const telefone = input.telefone.replace(/\D/g, '')
    if (telefone.length < 8) {
      throw new Error('Informe um telefone válido')
    }

    const lookup =
      input.clienteLookup &&
      input.clienteLookup.telefone.replace(/\D/g, '') === telefone
        ? input.clienteLookup
        : null

    if (lookup) {
      return lookup
    }

    const existenteRaw = await this.clientePort.buscarPorTelefone(telefone)
    const existente = existenteRaw
      ? normalizarClienteDeliveryPublico(existenteRaw)
      : null
    if (existente) {
      return existente
    }

    const criadoRaw = await this.clientePort.criar({
      telefone,
      nome: input.nome?.trim() || null,
    })
    const criado = normalizarClienteDeliveryPublico(criadoRaw)
    if (!criado) {
      throw new Error('Não foi possível cadastrar o cliente delivery')
    }
    return criado
  }
}
