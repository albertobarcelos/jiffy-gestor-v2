import {
  distanciaMetrosEntrePontos,
  parseGeoJsonPoint,
  type GeoJsonPoint,
} from '@/src/shared/types/geoJsonPoint'

/**
 * Domain service: distância em linha reta entre dois pontos (metros).
 * A formatação para UI fica na presentation.
 */
export function calcularDistanciaMetrosEntrePontos(
  a: GeoJsonPoint | null | undefined,
  b: GeoJsonPoint | null | undefined
): number | null {
  const pontoA = parseGeoJsonPoint(a)
  const pontoB = parseGeoJsonPoint(b)
  if (!pontoA || !pontoB) return null
  const metros = distanciaMetrosEntrePontos(pontoA, pontoB)
  if (!(metros >= 0) || !Number.isFinite(metros)) return null
  return metros
}

/** Preferência de entrega, senão pin do endereço. */
export function pontoClientePreferidoParaDistancia(endereco: {
  enderecoLocalizacao?: GeoJsonPoint | null
  preferenciaEntrega?: GeoJsonPoint | null
}): GeoJsonPoint | null {
  return (
    parseGeoJsonPoint(endereco.preferenciaEntrega) ??
    parseGeoJsonPoint(endereco.enderecoLocalizacao)
  )
}
