import type { GeoJsonPolygon, LatLngLiteral } from '@/src/shared/types/geoJsonPolygon'
import { latLngPathsToGeoJsonPolygon } from '@/src/shared/types/geoJsonPolygon'

const VERTICES_CIRCULO = 64

export function pathsDeCirculo(
  centro: LatLngLiteral,
  raioMetros: number,
  vertices = VERTICES_CIRCULO
): LatLngLiteral[] {
  if (raioMetros <= 0 || vertices < 3) {
    throw new Error('Círculo inválido')
  }
  const latRad = (centro.lat * Math.PI) / 180
  const metrosPorGrauLat = 111_320
  const metrosPorGrauLng = 111_320 * Math.cos(latRad)
  const paths: LatLngLiteral[] = []
  for (let i = 0; i < vertices; i++) {
    const angulo = (2 * Math.PI * i) / vertices
    paths.push({
      lat: centro.lat + (Math.sin(angulo) * raioMetros) / metrosPorGrauLat,
      lng: centro.lng + (Math.cos(angulo) * raioMetros) / metrosPorGrauLng,
    })
  }
  return paths
}

/** Anel entre inner e outer (furo). Outer horário; inner anti-horário para o Google Maps. */
export function pathsDeAnelFaixa(
  centro: LatLngLiteral,
  innerMetros: number,
  outerMetros: number
): LatLngLiteral[][] {
  const outer = pathsDeCirculo(centro, outerMetros)
  if (innerMetros <= 0) return [outer]
  const inner = pathsDeCirculo(centro, innerMetros).reverse()
  return [outer, inner]
}

export function geoJsonPolygonDeCirculo(
  centro: LatLngLiteral,
  raioMetros: number
): GeoJsonPolygon {
  return latLngPathsToGeoJsonPolygon(pathsDeCirculo(centro, raioMetros))
}
