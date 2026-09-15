import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

export interface EnderecoMorada {
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  complemento?: string
  referencia?: string
  enderecoLocalizacao?: GeoJsonPoint | null
  providerEnderecoId?: string | null
  preferenciaEntrega?: GeoJsonPoint | null
}

export interface MoradaTelefone {
  id: string
  telefone: string
  tipoEtiqueta?: string
  nomeMorada?: string
  endereco?: EnderecoMorada
}

export interface CriarMoradaTelefoneDTO {
  telefone: string
  tipoEtiqueta?: string
  nomeMorada?: string
  endereco: EnderecoMorada
}

export type AtualizarMoradaTelefoneDTO = CriarMoradaTelefoneDTO
