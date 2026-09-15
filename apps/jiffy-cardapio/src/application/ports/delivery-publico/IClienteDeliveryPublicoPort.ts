import type {
  AtualizarClienteDeliveryPublicoInput,
  ClienteDeliveryPublicoDTO,
  CriarClienteDeliveryPublicoInput,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export interface IClienteDeliveryPublicoPort {
  buscarPorTelefone(telefone: string): Promise<ClienteDeliveryPublicoDTO | null>
  criar(input: CriarClienteDeliveryPublicoInput): Promise<ClienteDeliveryPublicoDTO>
  atualizar(
    telefone: string,
    input: AtualizarClienteDeliveryPublicoInput
  ): Promise<ClienteDeliveryPublicoDTO>
}
