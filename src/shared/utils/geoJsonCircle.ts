import type { GeoJsonPolygon, LatLngLiteral } from '@/src/shared/types/geoJsonPolygon'
import { latLngPathsToGeoJsonPolygon } from '@/src/shared/types/geoJsonPolygon'

const VERTICES_CIRCULO = 64
/** Desvio relativo máximo entre raios para tratar o polígono como círculo. */
const TOLERANCIA_CIRCULO = 0.045
const MIN_VERTICES_DETECCAO_CIRCULO = 12
const RAIO_MINIMO_METROS = 15

export type CirculoDetectado = {
  centro: LatLngLiteral
  raioMetros: number
}

function distanciaMetrosAprox(a: LatLngLiteral, b: LatLngLiteral): number {
  const latRad = (((a.lat + b.lat) / 2) * Math.PI) / 180
  const dLat = (b.lat - a.lat) * 111_320
  const dLng = (b.lng - a.lng) * 111_320 * Math.cos(latRad)
  return Math.hypot(dLat, dLng)
}

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

/**
 * Infere centro/raio a partir de um anel (ex.: área criada com a ferramenta círculo).
 * Polígonos irregulares retornam null → edição por vértices.
 */
export function detectarCirculoEmPaths(paths: LatLngLiteral[]): CirculoDetectado | null {
  let pts = paths
  if (pts.length >= 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    if (
      Math.abs(first.lat - last.lat) < 1e-9 &&
      Math.abs(first.lng - last.lng) < 1e-9
    ) {
      pts = pts.slice(0, -1)
    }
  }
  if (pts.length < MIN_VERTICES_DETECCAO_CIRCULO) return null

  const centro: LatLngLiteral = {
    lat: pts.reduce((sum, p) => sum + p.lat, 0) / pts.length,
    lng: pts.reduce((sum, p) => sum + p.lng, 0) / pts.length,
  }
  const distancias = pts.map(p => distanciaMetrosAprox(centro, p))
  const media = distancias.reduce((sum, d) => sum + d, 0) / distancias.length
  if (media < RAIO_MINIMO_METROS) return null
  const variancia =
    distancias.reduce((sum, d) => sum + (d - media) ** 2, 0) / distancias.length
  const desvio = Math.sqrt(variancia)
  if (desvio / media > TOLERANCIA_CIRCULO) return null

  return { centro, raioMetros: media }
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
