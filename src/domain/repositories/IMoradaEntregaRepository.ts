import type {
  AtualizarMoradaTelefoneDTO,
  ClienteDeliveryIdentificacao,
  CriarMoradaTelefoneDTO,
  MoradaTelefone,
} from '@/src/domain/types/moradaEntrega'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

export interface IMoradaEntregaRepository {
  listarPorTelefone(
    telefone: string,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<MoradaTelefone[]>

  identificarClienteDeliveryPorTelefone(
    telefone: string,
    token: string
  ): Promise<ClienteDeliveryIdentificacao | null>

  criar(
    dto: CriarMoradaTelefoneDTO,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<MoradaTelefone>

  atualizar(
    id: string,
    dto: AtualizarMoradaTelefoneDTO,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<MoradaTelefone>

  excluir(
    id: string,
    telefoneDigitos: string,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<void>

  registrarUso(
    id: string,
    telefoneDigitos: string,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<void>

  buscarGeoEmpresa(token: string): Promise<{ enderecoLocalizacao: GeoJsonPoint | null }>
}
