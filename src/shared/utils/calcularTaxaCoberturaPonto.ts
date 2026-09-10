import type { AreaEntregaDTO, RaioEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import type { GeoJsonPolygonLike, GeoJsonPosition } from '@/src/shared/types/geoJsonPolygon'

export type ResultadoTaxaCoberturaPonto =
  | {
      coberta: true
      tipoCobranca: 'area' | 'raio'
      valorTaxa: number
      tempoEntregaInMinutes: number
      coberturaId: string
      coberturaNome: string | null
    }
  | {
      coberta: false
    }

function pontoEmAnel(ponto: GeoJsonPosition, ring: GeoJsonPosition[]): boolean {
  const [x, y] = ponto
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Ray casting — equivalente aproximado a ST_Contains para preview na UI. */
export function pontoEmPoligono(
  ponto: GeoJsonPosition,
  area: GeoJsonPolygonLike
): boolean {
  if (area.type === 'Polygon') {
    const [outer, ...holes] = area.coordinates
    if (!outer || !pontoEmAnel(ponto, outer)) return false
    return !holes.some(hole => pontoEmAnel(ponto, hole))
  }

  return area.coordinates.some(polygon => {
    const [outer, ...holes] = polygon
    if (!outer || !pontoEmAnel(ponto, outer)) return false
    return !holes.some(hole => pontoEmAnel(ponto, hole))
  })
}

/** Distância em metros (haversine) — alinhada a ST_DWithin geography para preview. */
export function distanciaMetrosEntrePontos(
  origem: GeoJsonPoint,
  destino: GeoJsonPoint
): number {
  const [lng1, lat1] = origem.coordinates
  const [lng2, lat2] = destino.coordinates
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6_371_008.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Espelha PreferenciaCoberturaEntregaPolicy do backend:
 * área ativa que contém o ponto tem prioridade; senão o menor raio que cobre.
 */
export function calcularTaxaCoberturaPonto(params: {
  destino: GeoJsonPoint
  origemEmpresa: GeoJsonPoint | null
  areas: AreaEntregaDTO[]
  raios: RaioEntregaDTO[]
}): ResultadoTaxaCoberturaPonto {
  const destinoCoords = params.destino.coordinates

  const areasAtivas = params.areas.filter(a => a.ativo)
  const areaMatch = areasAtivas.find(a => pontoEmPoligono(destinoCoords, a.area))
  if (areaMatch) {
    return {
      coberta: true,
      tipoCobranca: 'area',
      valorTaxa: areaMatch.valorTaxa,
      tempoEntregaInMinutes: areaMatch.tempoEntregaInMinutes,
      coberturaId: areaMatch.id,
      coberturaNome: areaMatch.nome,
    }
  }

  if (!params.origemEmpresa) {
    return { coberta: false }
  }

  const raiosAtivos = [...params.raios.filter(r => r.ativo)].sort(
    (a, b) => a.distanciaMaximaEmMetros - b.distanciaMaximaEmMetros
  )

  for (const raio of raiosAtivos) {
    const distancia = distanciaMetrosEntrePontos(params.origemEmpresa, params.destino)
    if (distancia <= raio.distanciaMaximaEmMetros) {
      return {
        coberta: true,
        tipoCobranca: 'raio',
        valorTaxa: raio.valorTaxa,
        tempoEntregaInMinutes: raio.tempoEntregaInMinutes,
        coberturaId: raio.id,
        coberturaNome: raio.nome,
      }
    }
  }

  return { coberta: false }
}

export function destinoGeoDaMoradaEndereco(endereco: {
  enderecoLocalizacao?: GeoJsonPoint | null
  preferenciaEntrega?: GeoJsonPoint | null
}): GeoJsonPoint | null {
  return endereco.preferenciaEntrega ?? endereco.enderecoLocalizacao ?? null
}
