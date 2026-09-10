import { z } from 'zod'

/** GeoJSON — ordem `[longitude, latitude]` (contrato backend). */
export const geoJsonPositionValidator = z.tuple([
  z.number().finite().gte(-180).lte(180),
  z.number().finite().gte(-90).lte(90),
])

export const geoJsonLinearRingValidator = z
  .array(geoJsonPositionValidator)
  .min(4, 'Polígono deve ter ao menos 4 vértices')

export const geoJsonPolygonValidator = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(geoJsonLinearRingValidator).min(1),
})

export const geoJsonMultiPolygonValidator = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(geoJsonLinearRingValidator).min(1)).min(1),
})

export const geoJsonPolygonLikeValidator = z.union([
  geoJsonPolygonValidator,
  geoJsonMultiPolygonValidator,
])

export type GeoJsonPosition = z.infer<typeof geoJsonPositionValidator>
export type GeoJsonPolygon = z.infer<typeof geoJsonPolygonValidator>
export type GeoJsonMultiPolygon = z.infer<typeof geoJsonMultiPolygonValidator>
export type GeoJsonPolygonLike = z.infer<typeof geoJsonPolygonLikeValidator>

export type LatLngLiteral = { lat: number; lng: number }

/** Converte paths do Google Maps (lat/lng) para GeoJSON Polygon. */
export function latLngPathsToGeoJsonPolygon(paths: LatLngLiteral[]): GeoJsonPolygon {
  if (paths.length < 3) {
    throw new Error('Desenhe um polígono com ao menos 3 vértices')
  }

  const ring: GeoJsonPosition[] = paths.map(p => [p.lng, p.lat])
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]])
  }

  if (ring.length < 4) {
    throw new Error('Polígono inválido — feche a área com ao menos 3 vértices')
  }

  return { type: 'Polygon', coordinates: [ring] }
}

/** Extrai anéis externos para renderização no Google Maps. */
export function geoJsonToLatLngRings(area: GeoJsonPolygonLike): LatLngLiteral[][] {
  if (area.type === 'Polygon') {
    return [area.coordinates[0].map(([lng, lat]) => ({ lat, lng }))]
  }
  return area.coordinates.map(polygon => polygon[0].map(([lng, lat]) => ({ lat, lng })))
}

/** Primeiro anel externo — útil para preview de rascunho. */
export function geoJsonToLatLngPath(area: GeoJsonPolygonLike): LatLngLiteral[] {
  const rings = geoJsonToLatLngRings(area)
  return rings[0] ?? []
}

export function parseGeoJsonPolygonLike(value: unknown): GeoJsonPolygonLike | null {
  const parsed = geoJsonPolygonLikeValidator.safeParse(value)
  return parsed.success ? parsed.data : null
}
