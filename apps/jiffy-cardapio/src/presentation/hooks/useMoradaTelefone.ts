/**
 * Stub de tipos para jiffy-cardapio.
 * O hook completo (que acessa authStore, fetchGestorApi, etc.) vive apenas no Gestor ERP.
 * Aqui exportamos somente as interfaces usadas por ClienteDeliveryMoradaMapper.
 */
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
  /** Geo opcional (Places Autocomplete). */
  enderecoLocalizacao?: GeoJsonPoint | null
  providerEnderecoId?: string | null
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

/** Mesmo contrato do POST (Swagger PATCH morada-telefone/{id}). */
export type AtualizarMoradaTelefoneDTO = CriarMoradaTelefoneDTO
