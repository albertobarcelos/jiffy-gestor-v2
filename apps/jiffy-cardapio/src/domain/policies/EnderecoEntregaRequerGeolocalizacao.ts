import { parseGeoJsonPoint, type GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

/**
 * Policy: entrega a domicílio exige geolocalização do endereço
 * (fonte única para UI + fluxo de checkout).
 */
export function enderecoEntregaTemGeolocalizacao(endereco: {
  enderecoLocalizacao?: GeoJsonPoint | null
}): boolean {
  return Boolean(parseGeoJsonPoint(endereco.enderecoLocalizacao))
}

export function entregaRequerGeolocalizacaoDoEndereco(params: {
  tipoEntrega: 'entrega' | 'retirada'
  endereco: { enderecoLocalizacao?: GeoJsonPoint | null } | null | undefined
}): boolean {
  if (params.tipoEntrega !== 'entrega') return false
  if (!params.endereco) return false
  return !enderecoEntregaTemGeolocalizacao(params.endereco)
}
